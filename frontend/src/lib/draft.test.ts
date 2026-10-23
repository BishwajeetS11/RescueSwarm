import { describe, expect, it } from "vitest";

import { previewDraft } from "./draft";

describe("previewDraft", () => {
  it("summarizes a well-formed draft", () => {
    const preview = previewDraft({
      name: "Draft",
      nodes: [{ id: "n-1", label: "Site", kind: "incident_site" }],
      edges: [{}, {}],
      incidents: [{ id: "inc-1", label: "Flood", node_id: "n-1", urgency: 4, people_affected: 12 }],
      medical_units: [{}],
    });
    expect(preview.name).toBe("Draft");
    expect(preview.counts).toMatchObject({ nodes: 1, edges: 2, incidents: 1, units: 1, shelters: 0 });
    expect(preview.incidents[0]).toMatchObject({ id: "inc-1", urgency: 4, people_affected: 12, status: "pending" });
  });

  it("survives malformed untrusted input without throwing", () => {
    const preview = previewDraft({ nodes: "nope", incidents: [1, null, { urgency: "high" }], name: 7 });
    expect(preview.name).toBe("Untitled draft");
    expect(preview.counts.nodes).toBe(0);
    expect(preview.incidents).toHaveLength(1);
    expect(preview.incidents[0]?.urgency).toBe(1);
  });
});
