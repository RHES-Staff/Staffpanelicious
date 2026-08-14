var Storage = (function () {
  var KEY = "staffpanelicious:v3";

  function seed() {
    var departments = [
      { key: "bod", name: "Board of Directors", head: 1, staff_level: 0, configuration: {}, servers: [] },
      { key: "dev", name: "Development Department", head: 2, staff_level: 0, configuration: {}, servers: [] },
      { key: "ad", name: "Administration Department", head: 3, staff_level: 0, configuration: {}, servers: [] },
      { key: "sys", name: "Systems Department", head: 2, staff_level: 0, configuration: {}, servers: [] },
      { key: "cr", name: "Community Department", head: 7, staff_level: 0, configuration: {}, servers: [] },
      { key: "qa", name: "Testing Department", head: 11, staff_level: 0, configuration: {}, servers: [] },
      { key: "wiki", name: "Wiki Department", head: 2, staff_level: 0, configuration: {}, servers: [] },
      { key: "cont", name: "Contributors", head: 1, staff_level: 0, configuration: {}, servers: [] },
      { key: "inst", name: "Instructor Department", head: 1, staff_level: 0, configuration: {}, servers: [] }
    ];

    var staff = [
      { staff_id: 1, discord_id: "1244953844451119157", name: "isaac", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 2, discord_id: "1258714895684341774", name: "inqsane", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 3, discord_id: "1281152012540575799", name: "AMPT", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 4, discord_id: "785598232130355200", name: "Keira", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 5, discord_id: "1207660814039777333", name: "FloFlo", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 6, discord_id: "572982926531231824", name: "tree", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 7, discord_id: "1289618351462547670", name: "ruptormeowbluegreen", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 8, discord_id: "579811641391054873", name: "madacetoutyt", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 9, discord_id: "689931033797460021", name: "Tungsten", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 10, discord_id: "860785995484758037", name: "bonny", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 11, discord_id: "816605174856155147", name: "chessmove4_", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 12, discord_id: "1516306333740306533", name: "andrispandris", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 13, discord_id: "744484355363045376", name: "Punnya", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false },
      { staff_id: 14, discord_id: "569532975910354962", name: "voxis3s", title: null, timezone: null, schedule: {}, is_active: true, is_blacklisted: false }
    ];

    var memberships = [
      [1, "bod"],
      [2, "bod"], [2, "sys"], [2, "wiki"],
      [3, "ad"], [4, "ad"], [5, "ad"], [6, "ad"],
      [7, "cr"], [8, "cr"], [9, "cr"],
      [10, "sys"],
      [11, "qa"], [12, "qa"], [13, "qa"], [14, "qa"]
    ].map(function (pair) {
      return { staff_id: pair[0], department_key: pair[1], is_active: true };
    });

    var assetTags = [
      { id: 1, name: "lead", color: "#c084fc" },
      { id: 2, name: "night shift", color: "#60a5fa" }
    ];

    var staffTags = [
      { id: 1, staff_id: 3, tag_id: 1, tagged_by: 1 }
    ];

    var notes = [];

    return {
      departments: departments,
      staff: staff,
      memberships: memberships,
      assetTags: assetTags,
      staffTags: staffTags,
      notes: notes,
      nextStaffId: 15,
      nextNoteId: 1,
      nextTagId: 3
    };
  }

  function migrate(data) {
    if (!data || !data.staff) return data;
    if (!data.assetTags) data.assetTags = [];
    if (!data.staffTags) data.staffTags = [];
    if (!data.notes) data.notes = [];
    if (!data.nextNoteId) data.nextNoteId = 1;
    if (!data.nextTagId) data.nextTagId = 1;
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