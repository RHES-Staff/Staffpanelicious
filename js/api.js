var Api = (function () {
  var USE_REMOTE = true;

  function db() {
    return Storage.load();
  }

  function persist(data) {
    Storage.save(data);
  }

  function http(endpoint, options) {
    options = options || {};
    options.credentials = "include";

    return fetch(Config.API_BASE + endpoint, options).then(function (r) {
      if (!r.ok) throw new Error("API Request Failed");
      return r.json();
    });
  }

  function findStaff(data, staffId) {
    return data.staff.find(function (s) {
      return s.staff_id === staffId;
    });
  }

  function tagsFor(data, staffId) {
    return data.staffTags
      .filter(function (t) {
        return t.staff_id === staffId;
      })
      .map(function (t) {
        var tag = data.assetTags.find(function (a) {
          return a.id === t.tag_id;
        });
        return tag ? tag.name : null;
      })
      .filter(Boolean);
  }

  function setTags(data, staffId, tagNames) {
    data.staffTags = data.staffTags.filter(function (t) {
      return t.staff_id !== staffId;
    });
    (tagNames || []).forEach(function (name) {
      var tag = data.assetTags.find(function (a) {
        return a.name === name;
      });
      if (!tag) {
        tag = { id: data.nextTagId++, name: name, color: "#94a3b8" };
        data.assetTags.push(tag);
      }
      data.staffTags.push({
        id: (data.nextStaffTagId = (data.nextStaffTagId || 1) + 1) - 1,
        staff_id: staffId,
        tag_id: tag.id,
        tagged_by: null,
      });
    });
  }

  function decorate(data, person) {
    if (!person) return person;
    person.tags = tagsFor(data, person.staff_id);
    person.notesList = data.notes.filter(function (n) {
      return n.staff_id === person.staff_id;
    });
    if (!person.tasks) person.tasks = [];
    return person;
  }

  function getBoard() {
    if (USE_REMOTE) {
      return http("/api/board");
    }
    var data = db();
    data.staff.forEach(function (p) {
      decorate(data, p);
    });
    return Promise.resolve(data);
  }

  function upsertStaff(payload) {
    if (USE_REMOTE) {
      return http("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    var data = db();
    var discordId = String(payload.discord_id).trim();
    var name = String(payload.name).trim();
    var deptKeys = payload.department_keys || [];

    var person = data.staff.find(function (s) {
      return s.discord_id === discordId;
    });

    if (!person) {
      person = {
        staff_id: data.nextStaffId++,
        discord_id: discordId,
        name: name,
        title: null,
        timezone: null,
        schedule: {},
        is_active: true,
        is_blacklisted: false,
        tasks: [],
      };
      data.staff.push(person);
    } else {
      person.name = name;
    }
    if (payload.tags) setTags(data, person.staff_id, payload.tags);

    deptKeys.forEach(function (deptKey) {
      var exists = data.memberships.some(function (m) {
        return m.staff_id === person.staff_id && m.department_key === deptKey;
      });
      if (!exists) {
        data.memberships.push({
          staff_id: person.staff_id,
          department_key: deptKey,
          is_active: true,
        });
      }
    });

    persist(data);
    return Promise.resolve(decorate(data, person));
  }

  function updateStaff(staffId, payload) {
    if (USE_REMOTE) {
      return http("/api/staff/" + staffId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    var data = db();
    var person = findStaff(data, staffId);
    if (!person) return Promise.reject(new Error("missing"));

    var discordId = String(payload.discord_id).trim();
    var taken = data.staff.some(function (s) {
      return s.staff_id !== staffId && s.discord_id === discordId;
    });
    if (taken) return Promise.reject(new Error("id taken"));

    person.discord_id = discordId;
    person.name = String(payload.name).trim();
    if (payload.tags) setTags(data, staffId, payload.tags);

    var keep = {};
    (payload.department_keys || []).forEach(function (key) {
      keep[key] = true;
    });
    data.memberships = data.memberships.filter(function (m) {
      return m.staff_id !== staffId || keep[m.department_key];
    });
    (payload.department_keys || []).forEach(function (deptKey) {
      var exists = data.memberships.some(function (m) {
        return m.staff_id === staffId && m.department_key === deptKey;
      });
      if (!exists) {
        data.memberships.push({
          staff_id: staffId,
          department_key: deptKey,
          is_active: true,
        });
      }
    });

    persist(data);
    return Promise.resolve(decorate(data, person));
  }

  function addNote(staffId, text) {
    if (USE_REMOTE) {
      return http("/api/staff/" + staffId + "/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: text }),
      });
    }

    var data = db();
    var person = findStaff(data, staffId);
    if (!person) return Promise.reject(new Error("missing"));
    var trimmed = String(text || "").trim();
    if (trimmed) {
      data.notes.push({
        id: data.nextNoteId++,
        staff_id: staffId,
        author_id: null,
        text: trimmed,
        created_at: new Date().toISOString(),
      });
    }
    persist(data);
    return Promise.resolve(decorate(data, person));
  }

  function addTask(staffId, title) {
    if (USE_REMOTE) {
      return http("/api/staff/" + staffId + "/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title }),
      });
    }

    var data = db();
    var person = findStaff(data, staffId);
    if (!person) return Promise.reject(new Error("missing"));
    if (!person.tasks) person.tasks = [];
    if (!data.nextTaskId) data.nextTaskId = 1;
    person.tasks.push({
      id: data.nextTaskId++,
      title: String(title).trim(),
      done: false,
    });
    persist(data);
    return Promise.resolve(decorate(data, person));
  }

  function toggleTask(staffId, taskId) {
    var data = db();
    var person = findStaff(data, staffId);
    if (!person || !person.tasks) return Promise.reject(new Error("missing"));
    person.tasks.forEach(function (task) {
      if (task.id === taskId) task.done = !task.done;
    });
    persist(data);
    return Promise.resolve(decorate(data, person));
  }

  function removeTask(staffId, taskId) {
    var data = db();
    var person = findStaff(data, staffId);
    if (!person || !person.tasks) return Promise.reject(new Error("missing"));
    person.tasks = person.tasks.filter(function (task) {
      return task.id !== taskId;
    });
    persist(data);
    return Promise.resolve(decorate(data, person));
  }

  function removeFromDepartment(staffId, departmentKey) {
    if (USE_REMOTE) {
      return http("/api/staff/" + staffId + "/departments/" + departmentKey, {
        method: "DELETE",
      });
    }

    var data = db();
    data.memberships = data.memberships.filter(function (m) {
      return !(m.staff_id === staffId && m.department_key === departmentKey);
    });
    persist(data);
    return Promise.resolve(true);
  }

  function setHeads(departmentKey, staffIds) {
    var headId = Array.isArray(staffIds) ? staffIds[0] || null : staffIds;

    if (USE_REMOTE) {
      return http("/api/departments/" + departmentKey + "/head", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: headId }),
      });
    }

    var data = db();
    var dept = data.departments.find(function (d) {
      return d.key === departmentKey;
    });
    if (!dept) return Promise.reject(new Error("missing"));
    dept.head = headId;
    persist(data);
    return Promise.resolve(true);
  }

  return {
    USE_REMOTE: USE_REMOTE,
    getBoard: getBoard,
    upsertStaff: upsertStaff,
    updateStaff: updateStaff,
    addNote: addNote,
    addTask: addTask,
    toggleTask: toggleTask,
    removeTask: removeTask,
    removeFromDepartment: removeFromDepartment,
    setHeads: setHeads,
  };
})();