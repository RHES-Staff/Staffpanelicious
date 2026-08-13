var Auth = (function () {
  var KEY = "staffpanelicious:session";
  var currentUser = null
  
  function sessionFromLocalStorage() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }
  
  function checkSession() {
    if (Api.USE_REMOTE) {
      return fetch(Config.API_BASE + "/api/auth/me", { credentials: "include" })
        .then(function (res) {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then(function (user) {
          currentUser = user;
          console.log(currentUser)
          return user;
        })
        .catch(function () {
          currentUser = null;
          return null;
        });
    }

    // Local / Mock Mode
    currentUser = sessionFromLocalStorage();
    return Promise.resolve(currentUser);
  }

  function session() {
    return currentUser;
  }

  // Local-only mock login functions stay unchanged
  function setSession(user) {
    currentUser = user;
    localStorage.setItem(KEY, JSON.stringify(user));
  }

  function logout() {
    currentUser = null;
    if (Api.USE_REMOTE) {
      return fetch(Config.API_BASE + "/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    }

    // Local Mode
    localStorage.removeItem(KEY);
    return Promise.resolve({ ok: true });
  }

  function loginWithDiscordId(discordId, name, board) {
    var id = String(discordId);
    var role = Config.ADMIN_DISCORD_IDS.indexOf(id) !== -1 ? "admin" : "staff";
    var display = name || id;
    if (board && board.staff) {
      var found = board.staff.find(function (s) {
        return s.discord_id === id;
      });
      if (found) display = found.name;
    }
    var user = { discord_id: id, name: display, role: role };
    if (!canViewBoard(board, user)) return null;
    setSession(user);
    return user;
  }

  function loginAdmin() {
    setSession({
      discord_id: Config.DEMO_ADMIN.discord_id,
      name: Config.DEMO_ADMIN.name,
      role: "admin",
    });
    return { ok: true };
  }

  function loginHead(person) {
    if (!person) return { ok: false };
    setSession({
      discord_id: person.discord_id,
      name: person.name,
      role: "staff",
    });
    return { ok: true };
  }

  function personFor(board, user) {
    if (!user || !board) return null;
    return (
      board.staff.find(function (s) {
        return s.discord_id === user.discord_id;
      }) || null
    );
  }

  function headedDepartmentIds(board, user) {
    var person = personFor(board, user);
    if (!person) return [];
    return board.heads
      .filter(function (h) {
        return h.staff_id === person.id;
      })
      .map(function (h) {
        return h.department_id;
      });
  }

  function isBoardMember(board, user) {
    var person = personFor(board, user);
    if (!person) return false;
    var dept = board.departments.find(function (d) {
      return d.slug === "board-of-directors";
    });
    if (!dept) return false;
    return board.memberships.some(function (m) {
      return m.staff_id === person.id && m.department_id === dept.id;
    });
  }

  function canViewBoard(board, user) {
    if (!user || !board) return false;
    if (user.role === "admin") return true;
    if (headedDepartmentIds(board, user).length) return true;
    return isBoardMember(board, user);
  }

  function canAddTo(board, user, departmentId) {
    if (!user) return false;
    if (user.role === "admin") return true;
    return headedDepartmentIds(board, user).indexOf(departmentId) !== -1;
  }

  function canManageHeads(user) {
    return !!(user && user.role === "admin");
  }

  function canRemoveFrom(board, user, departmentId) {
    return canAddTo(board, user, departmentId);
  }

  return {
    checkSession: checkSession,
    session: session,
    logout: logout,
    loginWithDiscordId: loginWithDiscordId,
    loginAdmin: loginAdmin,
    loginHead: loginHead,
    logout: logout,
    headedDepartmentIds: headedDepartmentIds,
    isBoardMember: isBoardMember,
    canViewBoard: canViewBoard,
    canAddTo: canAddTo,
    canManageHeads: canManageHeads,
    canRemoveFrom: canRemoveFrom,
  };
})();
