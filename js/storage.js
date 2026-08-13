var Storage = (function () {
  var KEY = "staffpanelicious:v3";

  function seed() {
    var departments = [
      { id: 1, name: "Board of Directors", slug: "board-of-directors", sort_order: 1 },
      { id: 2, name: "Development Department", slug: "development", sort_order: 2 },
      { id: 3, name: "Administration Department", slug: "administration", sort_order: 3 },
      { id: 4, name: "Systems Department", slug: "systems", sort_order: 4 },
      { id: 5, name: "Community Department", slug: "community", sort_order: 5 },
      { id: 6, name: "Testing Department", slug: "testing", sort_order: 6 },
      { id: 7, name: "Wiki Department", slug: "wiki", sort_order: 7 },
      { id: 8, name: "Contributors", slug: "contributors", sort_order: 8 },
      { id: 9, name: "Instructor Department", slug: "instructor", sort_order: 9 }
    ];

    var staff = [
      { id: 1, discord_id: "1244953844451119157", name: "isaac", status: "active" },
      { id: 2, discord_id: "1258714895684341774", name: "inqsane", status: "active" },
      { id: 3, discord_id: "1281152012540575799", name: "AMPT", status: "active" },
      { id: 4, discord_id: "785598232130355200", name: "Keira", status: "active" },
      { id: 5, discord_id: "1207660814039777333", name: "FloFlo", status: "active" },
      { id: 6, discord_id: "572982926531231824", name: "tree", status: "active" },
      { id: 7, discord_id: "1289618351462547670", name: "ruptormeowbluegreen", status: "active" },
      { id: 8, discord_id: "579811641391054873", name: "madacetoutyt", status: "active" },
      { id: 9, discord_id: "689931033797460021", name: "Tungsten", status: "active" },
      { id: 10, discord_id: "860785995484758037", name: "bonny", status: "active" },
      { id: 11, discord_id: "816605174856155147", name: "chessmove4_", status: "active" },
      { id: 12, discord_id: "1516306333740306533", name: "andrispandris", status: "active" },
      { id: 13, discord_id: "744484355363045376", name: "Punnya", status: "active" },
      { id: 14, discord_id: "569532975910354962", name: "voxis3s", status: "active" },
    ];

    var memberships = [
      [1, 1],
      [2, 1], [2, 4], [2, 7],
      [3, 3], [4, 3], [5, 3], [6, 3],
      [7, 5], [8, 5], [9, 5],
      [10, 4],
      [11, 6], [12, 6], [13, 6], [14, 6]
    ].map(function (pair) {
      return { staff_id: pair[0], department_id: pair[1] };
    });

    var heads = [
      { department_id: 3, staff_id: 3 },
      { department_id: 4, staff_id: 2 },
      { department_id: 7, staff_id: 2 }
    ];

    return {
      departments: departments,
      staff: staff,
      memberships: memberships,
      heads: heads,
      nextStaffId: 15
    };
  }

  function migrate(data) {
    if (!data || !data.staff) return data;
    if (!data.nextTaskId) data.nextTaskId = 1;
    data.staff.forEach(function (person) {
      if (!person.tags) person.tags = [];
      if (person.notes == null) person.notes = "";
      if (!person.tasks) person.tasks = [];
    });
    return data;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) {
        var data = migrate(seed());
        save(data);
        return data;
      }
      var parsed = migrate(JSON.parse(raw));
      save(parsed);
      return parsed;
    } catch (err) {
      var fresh = migrate(seed());
      save(fresh);
      return fresh;
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  return {
    load: load,
    save: save,
    seed: seed,
    KEY: KEY
  };
})();
