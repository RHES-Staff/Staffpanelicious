var App = (function () {
  var root;
  var board = null;
  var modal = null;
  var toastTimer = null;
  var openMenu = null;
  var expandedTasks = {};
  var collapsedDepts = {};

  function $(sel, el) {
    return (el || document).querySelector(sel);
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function user() {
    return Auth.session();
  }

  function toast(msg) {
    var old = $(".toast");
    if (old) old.remove();
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.remove();
    }, 1800);
  }

  function themeLabel() {
    return Theme.current() === "dark" ? "Light" : "Dark";
  }

  function themeBtn() {
    return (
      '<button class="ghost" type="button" data-action="theme">' +
      themeLabel() +
      "</button>"
    );
  }

  function render() {
    if (!user()) renderLogin();
    else if (!Auth.canViewBoard(board, user())) renderDenied();
    else renderBoard();
  }

  function renderDenied() {
    root.innerHTML =
      '<div class="login-wrap">' +
      '<div class="login-card">' +
      "<h1>No access</h1>" +
      '<p class="sub">This panel is only for admins, department heads, and the board.</p>' +
      '<button class="ghost" type="button" data-action="logout">Log out</button>' +
      "</div></div>";
  }

  function renderLogin(opts) {
    opts = opts || {};
    var step = opts.step || "discord";
    var inner;

    if (step === "discord") {
      inner =
        '<button class="discord-btn" type="button" data-action="discord">' +
        discordIcon() +
        " Login with Discord</button>";
    } else if (step === "choose") {
      inner =
        '<div class="access-row">' +
        '<button class="ghost" type="button" data-action="head-login">Head login</button>' +
        '<button class="solid" type="button" data-action="admin-login">Admin access</button>' +
        "</div>";
    } else {
      inner =
        '<div class="head-pick">' +
        uniqueHeads()
          .map(function (person) {
            return (
              '<button class="ghost" type="button" data-action="pick-head" data-staff="' +
              person.staff_id +
              '">' +
              esc(person.name) +
              "<small>" +
              esc(headDeptsLabel(person.staff_id)) +
              "</small></button>"
            );
          })
          .join("") +
        "</div>" +
        '<button class="ghost" type="button" data-action="choose" style="margin-top:12px">Back</button>';
    }

    root.innerHTML =
      '<div class="login-wrap">' +
      '<div class="login-card">' +
      "<h1>" +
      esc(Config.title) +
      "</h1>" +
      '<p class="sub">' +
      esc(Config.org) +
      "</p>" +
      inner +
      "</div></div>";
  }

  function uniqueHeads() {
    var seen = {};
    var list = [];
    board.departments.forEach(function (d) {
      if (d.head == null || seen[d.head]) return;
      var person = staffById(d.head);
      if (!person) return;
      seen[d.head] = true;
      list.push(person);
    });
    return list.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  function headDeptsLabel(staffId) {
    return board.departments
      .filter(function (d) {
        return d.head === staffId;
      })
      .map(function (d) {
        return d.name;
      })
      .join(", ");
  }

  function kebabIcon() {
    return (
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>' +
      "</svg>"
    );
  }

  function discordIcon() {
    return (
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M20 4.3A16.8 16.8 0 0 0 15.6 3l-.2.4c2 .5 3.1 1.2 3.1 1.2A13.4 13.4 0 0 0 12 3a13.4 13.4 0 0 0-6.5 1.6s1.1-.7 3.2-1.2L8.4 3A16.8 16.8 0 0 0 4 4.3S1.5 8 1 15.2c0 0 2.3 2 5.7 2.1l1.4-1.9c-2.4-.7-3.3-2.2-3.3-2.2s.2.1.5.3c0 0 0 0 .1 0 .1.1.3.2.4.2A10.7 10.7 0 0 0 12 16.2a10.7 10.7 0 0 0 6.2-2.5l.9-.6s-.9 1.5-3.4 2.2l1.4 1.9c3.4-.1 5.7-2.1 5.7-2.1-.5-7.2-3-10.9-3-10.9zM8.7 13.4c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7zm6.6 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z"/></svg>'
    );
  }

  function staffById(id) {
    return board.staff.find(function (s) {
      return s.staff_id === id;
    });
  }

  function headsFor(deptKey) {
    var dept = board.departments.find(function (d) {
      return d.key === deptKey;
    });
    if (!dept || dept.head == null) return [];
    var person = staffById(dept.head);
    return person ? [person] : [];
  }

  function membersFor(deptKey) {
    return board.memberships
      .filter(function (m) {
        return m.department_key === deptKey && m.is_active !== false;
      })
      .map(function (m) {
        return staffById(m.staff_id);
      })
      .filter(Boolean);
  }

  function headLabel(deptKey) {
    var names = headsFor(deptKey).map(function (s) {
      return s.name;
    });
    if (!names.length) return "Head: -";
    return "Head: " + names.join(", ");
  }

  function renderBoard() {
    var me = user();
    var cols = board.departments.map(renderColumn).join("");

    root.innerHTML =
      '<div class="board-page">' +
      '<header class="topbar">' +
      '<div class="brand"><strong>' +
      esc(Config.title) +
      "</strong><em>" +
      esc(Config.org) +
      "</em></div>" +
      '<div class="top-actions">' +
      '<span class="who">' +
      esc(me.name) +
      " · " +
      esc(me.role) +
      "</span>" +
      (Auth.canManageHeads(me)
        ? '<button class="ghost" type="button" data-action="heads">Heads</button>'
        : "") +
      themeBtn() +
      '<button class="ghost" type="button" data-action="logout">Log out</button>' +
      "</div></header>" +
      '<div class="board">' +
      cols +
      "</div>" +
      '<footer class="footer">Property of ' +
      esc(Config.org) +
      " · 2026</footer>" +
      "</div>" +
      (modal || "");
  }

  function renderColumn(dept) {
    var me = user();
    var members = membersFor(dept.key);
    var canAdd = Auth.canAddTo(board, me, dept.key);
    var canRemove = Auth.canRemoveFrom(board, me, dept.key);
    var admin = Auth.canManageHeads(me);
    var collapsed = !!collapsedDepts[dept.key];

    var cards = members
      .map(function (person) {
        var menuKey = person.staff_id + "-" + dept.key;
        var tags = person.tags || [];
        var tasks = person.tasks || [];
        var done = tasks.filter(function (task) {
          return task.done;
        }).length;
        var tagHtml = tags.length
          ? '<div class="staff-tags">' +
            tags
              .map(function (tag) {
                return '<span class="staff-tag">' + esc(tag) + "</span>";
              })
              .join("") +
            "</div>"
          : "";
        var taskHtml = "";
        if (tasks.length) {
          var open = !!expandedTasks[person.staff_id];
          taskHtml =
            '<div class="task-bar">' +
            '<button class="task-bar-head" type="button" data-action="toggle-tasks" data-staff="' +
            person.staff_id +
            '"><span>Tasks ' +
            done +
            " / " +
            tasks.length +
            "</span><span>" +
            (open ? "⌃" : "⌄") +
            "</span></button>" +
            (open
              ? '<div class="task-bar-list">' +
                tasks
                  .map(function (task) {
                    return (
                      '<div class="task-row' +
                      (task.done ? " done" : "") +
                      '">' +
                      esc(task.title) +
                      "</div>"
                    );
                  })
                  .join("") +
                "</div>"
              : "") +
            "</div>";
        }
        var statusLabel = person.is_blacklisted
          ? "Blacklisted"
          : person.is_active
            ? "Active"
            : "Inactive";
        return (
          '<article class="card">' +
          (canRemove
            ? '<div class="card-menu-wrap">' +
              '<button class="kebab" type="button" data-action="menu" data-staff="' +
              person.staff_id +
              '" data-dept="' +
              dept.key +
              '">' +
              kebabIcon() +
              "</button>" +
              (openMenu === menuKey
                ? '<div class="card-menu">' +
                  '<button type="button" data-action="edit" data-staff="' +
                  person.staff_id +
                  '">Edit</button>' +
                  '<button type="button" data-action="open-tasks" data-staff="' +
                  person.staff_id +
                  '">Tasks</button>' +
                  '<button type="button" data-action="open-notes" data-staff="' +
                  person.staff_id +
                  '">Notes</button>' +
                  '<button type="button" data-action="remove" data-staff="' +
                  person.staff_id +
                  '" data-dept="' +
                  dept.key +
                  '">Remove</button>' +
                  "</div>"
                : "") +
              "</div>"
            : "") +
          tagHtml +
          '<div class="card-name">' +
          esc(person.name) +
          "</div>" +
          '<div class="card-id">' +
          esc(person.discord_id) +
          "</div>" +
          '<span class="badge">' +
          esc(statusLabel) +
          "</span>" +
          taskHtml +
          "</article>"
        );
      })
      .join("");

    var addBtn = canAdd
      ? '<button class="add-slot" type="button" data-action="add" data-dept="' +
        dept.key +
        '">add</button>'
      : "";

    return (
      '<section class="column' + (collapsed ? " collapsed" : "") + '">' +
      '<div class="col-head" data-action="toggle-column" data-dept="' +
      dept.key +
      '">' +
      '<div><div class="col-title">' +
      esc(dept.name) +
      '</div><div class="col-heads">' +
      (admin
        ? '<button type="button" data-action="heads" data-dept="' +
          dept.key +
          '">' +
          esc(headLabel(dept.key)) +
          "</button>"
        : esc(headLabel(dept.key))) +
      "</div></div>" +
      '<span class="count">' +
      members.length +
      "</span>" +
      '<span class="col-toggle">' +
      (collapsed ? "⌄" : "⌃") +
      "</span>" +
      "</div>" +
      (members.length ? "" : addBtn) +
      '<div class="cards">' +
      cards +
      "</div>" +
      (members.length ? addBtn : "") +
      "</section>"
    );
  }

  function allowedDepartments(presetDeptKey) {
    var me = user();
    if (me.role === "admin") return board.departments.slice();
    var keys = Auth.headedDepartmentIds(board, me);
    return board.departments.filter(function (d) {
      if (presetDeptKey && keys.indexOf(presetDeptKey) !== -1) {
        return d.key === presetDeptKey || keys.indexOf(d.key) !== -1;
      }
      return keys.indexOf(d.key) !== -1;
    });
  }

  function staffDeptKeys(staffId) {
    return board.memberships
      .filter(function (m) {
        return m.staff_id === staffId;
      })
      .map(function (m) {
        return m.department_key;
      });
  }

  function openRegister(deptKey) {
    openStaffForm({ deptKey: deptKey });
  }

  function openStaffForm(opts) {
    var person = opts.person || null;
    var deptKey = opts.deptKey || null;
    var current = person ? staffDeptKeys(person.staff_id) : [];
    var depts = allowedDepartments(deptKey);
    var locked = {};
    if (person) {
      current.forEach(function (key) {
        if (!Auth.canAddTo(board, user(), key)) locked[key] = true;
      });
    }

    var shown = board.departments.filter(function (d) {
      return (
        depts.some(function (x) {
          return x.key === d.key;
        }) || locked[d.key]
      );
    });

    var pills = shown
      .map(function (d) {
        var selected = person
          ? current.indexOf(d.key) !== -1
          : d.key === deptKey;
        var isLocked = !!locked[d.key];
        return (
          '<button type="button" class="pill' +
          (selected ? " on" : "") +
          '" data-action="pill" data-dept="' +
          d.key +
          '"' +
          (isLocked ? " disabled" : "") +
          ">" +
          esc(d.name) +
          "</button>"
        );
      })
      .join("");

    modal =
      '<div class="backdrop" data-action="close-modal">' +
      '<form class="modal" data-action="save-staff">' +
      (person
        ? '<input type="hidden" name="staff_id" value="' +
          person.staff_id +
          '">'
        : "") +
      "<h2>" +
      (person ? "Edit Staff" : "Register Staff") +
      "</h2>" +
      '<div class="field"><label>Discord ID</label>' +
      '<input name="discord_id" required autocomplete="off" value="' +
      (person ? esc(person.discord_id) : "") +
      '"></div>' +
      '<div class="field"><label>Name</label>' +
      '<input name="name" required autocomplete="off" value="' +
      (person ? esc(person.name) : "") +
      '"></div>' +
      '<div class="field"><label>Tags</label>' +
      '<input name="tags" autocomplete="off" placeholder="lead, night shift" value="' +
      (person && person.tags ? esc(person.tags.join(", ")) : "") +
      '"></div>' +
      '<div class="field"><label>Departments</label>' +
      '<div class="pills">' +
      pills +
      "</div></div>" +
      '<div class="modal-actions">' +
      '<button class="ghost" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="solid" type="submit">Save</button>' +
      "</div></form></div>";
    renderBoard();
  }

  function openHeads(focusDeptKey) {
    var blocks = board.departments
      .map(function (dept) {
        var options = membersFor(dept.key)
          .slice()
          .sort(function (a, b) {
            return a.name.localeCompare(b.name);
          })
          .map(function (s) {
            return (
              '<label><input type="radio" name="head-' +
              dept.key +
              '" value="' +
              s.staff_id +
              '"' +
              (dept.head === s.staff_id ? " checked" : "") +
              "> " +
              esc(s.name) +
              "</label>"
            );
          })
          .join("");
        var noneChecked = dept.head == null ? " checked" : "";
        return (
          '<div class="head-block"' +
          (focusDeptKey === dept.key
            ? ' style="outline:2px solid var(--accent)"'
            : "") +
          "><h3>" +
          esc(dept.name) +
          '</h3><div class="head-list">' +
          '<label><input type="radio" name="head-' +
          dept.key +
          '" value=""' +
          noneChecked +
          "> None</label>" +
          options +
          "</div></div>"
        );
      })
      .join("");

    modal =
      '<div class="backdrop" data-action="close-modal">' +
      '<form class="modal" data-action="save-heads">' +
      "<h2>Department heads</h2>" +
      blocks +
      '<div class="modal-actions">' +
      '<button class="ghost" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="solid" type="submit">Save</button>' +
      "</div></form></div>";
    renderBoard();
  }

  function openNotes(staffId) {
    var person = staffById(staffId);
    if (!person) return;
    var notes = (person.notesList || []).slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    var rows = notes
      .map(function (n) {
        return '<div class="note-row"><p>' + esc(n.text) + "</p></div>";
      })
      .join("");
    modal =
      '<div class="backdrop" data-action="close-modal">' +
      '<form class="modal" data-action="save-notes">' +
      '<input type="hidden" name="staff_id" value="' +
      person.staff_id +
      '">' +
      "<h2>Notes</h2>" +
      '<div class="notes-list">' +
      (rows || '<p class="empty-notes">No notes yet</p>') +
      "</div>" +
      '<div class="field"><textarea name="note" rows="4" placeholder="Add a note"></textarea></div>' +
      '<div class="modal-actions">' +
      '<button class="ghost" type="button" data-action="close-modal">Close</button>' +
      '<button class="solid" type="submit">Add</button>' +
      "</div></form></div>";
    renderBoard();
  }

  function openTasks(staffId) {
    var person = staffById(staffId);
    if (!person) return;
    var tasks = person.tasks || [];
    var rows = tasks
      .map(function (task) {
        return (
          '<div class="task-edit-row">' +
          '<label><input type="checkbox" data-action="toggle-task" data-staff="' +
          person.staff_id +
          '" data-task="' +
          task.id +
          '"' +
          (task.done ? " checked" : "") +
          "> " +
          esc(task.title) +
          "</label>" +
          '<button class="ghost" type="button" data-action="delete-task" data-staff="' +
          person.staff_id +
          '" data-task="' +
          task.id +
          '">×</button></div>'
        );
      })
      .join("");
    modal =
      '<div class="backdrop" data-action="close-modal">' +
      '<form class="modal" data-action="add-task">' +
      '<input type="hidden" name="staff_id" value="' +
      person.staff_id +
      '">' +
      "<h2>Tasks</h2>" +
      '<div class="task-edit-list">' +
      (rows || '<p class="empty-tasks">No tasks</p>') +
      "</div>" +
      '<div class="field"><input name="title" autocomplete="off" placeholder="New task"></div>' +
      '<div class="modal-actions">' +
      '<button class="ghost" type="button" data-action="close-modal">Close</button>' +
      '<button class="solid" type="submit">Add</button>' +
      "</div></form></div>";
    renderBoard();
  }

  function parseTags(value) {
    return String(value || "")
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);
  }

  function closeModal() {
    modal = null;
    renderBoard();
  }

  function selectedPills(form) {
    var keys = [];
    form.querySelectorAll(".pill.on").forEach(function (btn) {
      keys.push(btn.getAttribute("data-dept"));
    });
    return keys;
  }

  function onClick(e) {
    var t = e.target.closest("[data-action]");
    if (!t) {
      if (openMenu) {
        openMenu = null;
        renderBoard();
      }
      return;
    }
    var action = t.getAttribute("data-action");
    if (action !== "menu") openMenu = null;

    if (action === "theme") {
      Theme.toggle();
      render();
      return;
    }

    if (action === "discord") {
      if (Api.USE_REMOTE) {
        window.location.href = Config.API_BASE + "/api/auth/discord/login";
      } else {
        renderLogin({ step: "choose" });
      }
      return;
    }

    if (action === "choose") {
      renderLogin({ step: "choose" });
      return;
    }
    if (action === "head-login") {
      renderLogin({ step: "heads" });
      return;
    }
    if (action === "pick-head") {
      var head = staffById(Number(t.getAttribute("data-staff")));
      Auth.loginHead(head);
      render();
      return;
    }
    if (action === "admin-login") {
      Auth.loginAdmin();
      render();
      return;
    }
    if (action === "logout") {
      Auth.logout().then(function () {
        modal = null;
        render();
      });
      return;
    }
    if (action === "close-modal") {
      if (t.classList.contains("backdrop") && e.target !== t) return;
      closeModal();
      return;
    }
    if (action === "add") {
      openRegister(t.getAttribute("data-dept"));
      return;
    }
    if (action === "menu") {
      var key =
        t.getAttribute("data-staff") + "-" + t.getAttribute("data-dept");
      openMenu = openMenu === key ? null : key;
      renderBoard();
      return;
    }
    if (action === "edit") {
      var editId = Number(t.getAttribute("data-staff"));
      var who = staffById(editId);
      if (who) openStaffForm({ person: who });
      return;
    }
    if (action === "open-notes") {
      openNotes(Number(t.getAttribute("data-staff")));
      return;
    }
    if (action === "open-tasks") {
      openTasks(Number(t.getAttribute("data-staff")));
      return;
    }
    if (action === "toggle-tasks") {
      var sid = Number(t.getAttribute("data-staff"));
      expandedTasks[sid] = !expandedTasks[sid];
      renderBoard();
      return;
    }
    if (action === "toggle-task") {
      Api.toggleTask(
        Number(t.getAttribute("data-staff")),
        Number(t.getAttribute("data-task")),
      )
        .then(function () {
          return Api.getBoard();
        })
        .then(function (data) {
          board = data;
          openTasks(Number(t.getAttribute("data-staff")));
        });
      return;
    }
    if (action === "toggle-column") {
      var deptKey = t.getAttribute("data-dept");
      collapsedDepts[deptKey] = !collapsedDepts[deptKey];
      renderBoard();
      return;
    }
    if (action === "delete-task") {
      Api.removeTask(
        Number(t.getAttribute("data-staff")),
        Number(t.getAttribute("data-task")),
      )
        .then(function () {
          return Api.getBoard();
        })
        .then(function (data) {
          board = data;
          openTasks(Number(t.getAttribute("data-staff")));
        });
      return;
    }
    if (action === "heads") {
      openHeads(t.getAttribute("data-dept"));
      return;
    }
    if (action === "pill") {
      t.classList.toggle("on");
      return;
    }
    if (action === "remove") {
      var staffId = Number(t.getAttribute("data-staff"));
      var deptKey = t.getAttribute("data-dept");
      Api.removeFromDepartment(staffId, deptKey)
        .then(function () {
          return Api.getBoard();
        })
        .then(function (data) {
          board = data;
          toast("Removed");
          renderBoard();
        });
    }
  }

  function onSubmit(e) {
    var form = e.target.closest("[data-action]");
    if (!form) return;
    var action = form.getAttribute("data-action");

    if (action === "save-staff") {
      e.preventDefault();
      var deptKeys = selectedPills(form);
      var staffId = form.staff_id ? Number(form.staff_id.value) : null;
      if (staffId != null) {
        staffDeptKeys(staffId).forEach(function (key) {
          if (
            !Auth.canAddTo(board, user(), key) &&
            deptKeys.indexOf(key) === -1
          ) {
            deptKeys.push(key);
          }
        });
      }
      if (!deptKeys.length) {
        toast("Pick a department");
        return;
      }
      var me = user();
      var illegal = deptKeys.some(function (key) {
        return (
          !Auth.canAddTo(board, me, key) &&
          !(staffId != null && staffDeptKeys(staffId).indexOf(key) !== -1)
        );
      });
      if (illegal) {
        toast("Not your department");
        return;
      }
      var job = staffId != null
        ? Api.updateStaff(staffId, {
            discord_id: form.discord_id.value,
            name: form.name.value,
            department_keys: deptKeys,
            tags: parseTags(form.tags ? form.tags.value : ""),
          })
        : Api.upsertStaff({
            discord_id: form.discord_id.value,
            name: form.name.value,
            department_keys: deptKeys,
            tags: parseTags(form.tags ? form.tags.value : ""),
          });
      job
        .then(function () {
          return Api.getBoard();
        })
        .then(function (data) {
          board = data;
          modal = null;
          toast("Saved");
          renderBoard();
        })
        .catch(function () {
          toast("Couldn't save");
        });
      return;
    }

    if (action === "save-notes") {
      e.preventDefault();
      var noteText = form.note.value.trim();
      if (!noteText) {
        closeModal();
        return;
      }
      Api.addNote(Number(form.staff_id.value), noteText)
        .then(function () {
          return Api.getBoard();
        })
        .then(function (data) {
          board = data;
          modal = null;
          toast("Saved");
          renderBoard();
        });
      return;
    }

    if (action === "add-task") {
      e.preventDefault();
      var title = form.title.value.trim();
      if (!title) return;
      var taskStaff = Number(form.staff_id.value);
      Api.addTask(taskStaff, title)
        .then(function () {
          return Api.getBoard();
        })
        .then(function (data) {
          board = data;
          expandedTasks[taskStaff] = true;
          openTasks(taskStaff);
        });
      return;
    }

    if (action === "save-heads") {
      e.preventDefault();
      if (!Auth.canManageHeads(user())) return;
      var jobs = board.departments.map(function (dept) {
        var picked = form.querySelector(
          'input[name="head-' + dept.key + '"]:checked',
        );
        var staffId = picked && picked.value ? Number(picked.value) : null;
        return Api.setHeads(dept.key, staffId != null ? [staffId] : []);
      });
      Promise.all(jobs)
        .then(function () {
          return Api.getBoard();
        })
        .then(function (data) {
          board = data;
          modal = null;
          toast("Saved");
          renderBoard();
        });
    }
  }

  function onKey(e) {
    if (e.key === "Escape" && modal) closeModal();
  }

  function init() {
    Theme.init();
    root = document.getElementById("app");
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", onKey);
    Auth.checkSession()
      .then(function () {
        return Api.getBoard();
      })
      .then(function (data) {
        board = data;
        render();
      })
      .catch(function () {
        render(); // Renders login if unauthorized or error
      });
    Api.getBoard().then(function (data) {
      board = data;
      render();
    });
  }

  return { init: init };
})();

document.addEventListener("DOMContentLoaded", App.init);