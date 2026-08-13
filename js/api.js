var Api = (function () {
  var USE_REMOTE = false;

  function db() {
    return Storage.load();
  }

  function persist(data) {
    Storage.save(data);
  }

  function getBoard() {
    if (USE_REMOTE) {
      return fetch(Config.API_BASE + "/api/board").then(function (r) {
        return r.json();
      });
    }
    return Promise.resolve(db());
  }

  function upsertStaff(payload) {
    if (USE_REMOTE) {
      return fetch(Config.API_BASE + "/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json();
      });
    }

    var data = db();
    var discordId = String(payload.discord_id).trim();
    var name = String(payload.name).trim();
    var deptIds = payload.department_ids || [];

    var person = data.staff.find(function (s) {
      return s.discord_id === discordId;
    });

    if (!person) {
      person = {
        id: data.nextStaffId++,
        discord_id: discordId,
        name: name,
        status: "active",
        tags: [],
        notes: "",
        tasks: []
      };
      data.staff.push(person);
    } else {
      person.name = name;
    }
    if (payload.tags) person.tags = payload.tags;

    deptIds.forEach(function (deptId) {
      var exists = data.memberships.some(function (m) {
        return m.staff_id === person.id && m.department_id === deptId;
      });
      if (!exists) {
        data.memberships.push({ staff_id: person.id, department_id: deptId });
      }
    });

    persist(data);
    return Promise.resolve(person);
  }

  function updateStaff(staffId, payload) {
    if (USE_REMOTE) {
      return fetch(Config.API_BASE + "/api/staff/" + staffId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json();
      });
    }

    var data = db();
    var person = data.staff.find(function (s) {
      return s.id === staffId;
    });
    if (!person) return Promise.reject(new Error("missing"));

    var discordId = String(payload.discord_id).trim();
    var taken = data.staff.some(function (s) {
      return s.id !== staffId && s.discord_id === discordId;
    });
    if (taken) return Promise.reject(new Error("id taken"));

    person.discord_id = discordId;
    person.name = String(payload.name).trim();
    if (payload.tags) person.tags = payload.tags;

    var keep = {};
    (payload.department_ids || []).forEach(function (id) {
      keep[id] = true;
    });
    data.memberships = data.memberships.filter(function (m) {
      return m.staff_id !== staffId || keep[m.department_id];
    });
    (payload.department_ids || []).forEach(function (deptId) {
      var exists = data.memberships.some(function (m) {
        return m.staff_id === staffId && m.department_id === deptId;
      });
      if (!exists) {
        data.memberships.push({ staff_id: staffId, department_id: deptId });
      }
    });

    persist(data);
    return Promise.resolve(person);
  }

  function patchStaff(staffId, fields) {
    if (USE_REMOTE) {
      return fetch(Config.API_BASE + "/api/staff/" + staffId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields)
      }).then(function (r) {
        return r.json();
      });
    }

    var data = db();
    var person = data.staff.find(function (s) {
      return s.id === staffId;
    });
    if (!person) return Promise.reject(new Error("missing"));
    if (fields.notes != null) person.notes = String(fields.notes);
    if (fields.tags) person.tags = fields.tags;
    if (fields.tasks) person.tasks = fields.tasks;
    persist(data);
    return Promise.resolve(person);
  }

  function addTask(staffId, title) {
    var data = db();
    var person = data.staff.find(function (s) {
      return s.id === staffId;
    });
    if (!person) return Promise.reject(new Error("missing"));
    if (!person.tasks) person.tasks = [];
    if (!data.nextTaskId) data.nextTaskId = 1;
    person.tasks.push({
      id: data.nextTaskId++,
      title: String(title).trim(),
      done: false
    });
    persist(data);
    return Promise.resolve(person);
  }

  function toggleTask(staffId, taskId) {
    var data = db();
    var person = data.staff.find(function (s) {
      return s.id === staffId;
    });
    if (!person || !person.tasks) return Promise.reject(new Error("missing"));
    person.tasks.forEach(function (task) {
      if (task.id === taskId) task.done = !task.done;
    });
    persist(data);
    return Promise.resolve(person);
  }

  function removeTask(staffId, taskId) {
    var data = db();
    var person = data.staff.find(function (s) {
      return s.id === staffId;
    });
    if (!person || !person.tasks) return Promise.reject(new Error("missing"));
    person.tasks = person.tasks.filter(function (task) {
      return task.id !== taskId;
    });
    persist(data);
    return Promise.resolve(person);
  }

  function removeFromDepartment(staffId, departmentId) {
    if (USE_REMOTE) {
      return fetch(
        Config.API_BASE + "/api/staff/" + staffId + "/departments/" + departmentId,
        { method: "DELETE" }
      ).then(function () {
        return true;
      });
    }

    var data = db();
    data.memberships = data.memberships.filter(function (m) {
      return !(m.staff_id === staffId && m.department_id === departmentId);
    });
    persist(data);
    return Promise.resolve(true);
  }

  function setHeads(departmentId, staffIds) {
    if (USE_REMOTE) {
      return fetch(Config.API_BASE + "/api/departments/" + departmentId + "/heads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_ids: staffIds })
      }).then(function (r) {
        return r.json();
      });
    }

    var data = db();
    data.heads = data.heads.filter(function (h) {
      return h.department_id !== departmentId;
    });
    staffIds.forEach(function (staffId) {
      data.heads.push({ department_id: departmentId, staff_id: staffId });
    });
    persist(data);
    return Promise.resolve(true);
  }

  return {
    USE_REMOTE: USE_REMOTE,
    getBoard: getBoard,
    upsertStaff: upsertStaff,
    updateStaff: updateStaff,
    patchStaff: patchStaff,
    addTask: addTask,
    toggleTask: toggleTask,
    removeTask: removeTask,
    removeFromDepartment: removeFromDepartment,
    setHeads: setHeads
  };
})();
