import { describe, it, expect, beforeEach } from "vitest";
import { detectFormFields } from "../src/shared/field-detector";
import { applyFormValues } from "../src/shared/field-filler";

describe("MozhiFill Browser Extension — Field Detector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("detects standard form inputs, textareas, and select elements", () => {
    document.body.innerHTML = `
      <form id="test-form">
        <label for="name-input">Full Name</label>
        <input id="name-input" type="text" required />

        <label for="email-input">Email Address</label>
        <input id="email-input" type="email" placeholder="name@example.com" />

        <label for="phone-input">Mobile Number</label>
        <input id="phone-input" type="tel" />

        <label for="city-select">Select City</label>
        <select id="city-select">
          <option value="">Choose city</option>
          <option value="Chennai">Chennai</option>
          <option value="Coimbatore">Coimbatore</option>
        </select>

        <label for="bio-textarea">About You</label>
        <textarea id="bio-textarea"></textarea>
      </form>
    `;

    const fields = detectFormFields(document);

    expect(fields).toHaveLength(5);
    expect(fields[0].id).toBe("name-input");
    expect(fields[0].label).toBe("Full Name");
    expect(fields[0].type).toBe("text");
    expect(fields[0].required).toBe(true);

    expect(fields[1].id).toBe("email-input");
    expect(fields[1].label).toBe("Email Address");
    expect(fields[1].type).toBe("email");
    expect(fields[1].placeholder).toBe("name@example.com");

    expect(fields[2].id).toBe("phone-input");
    expect(fields[2].type).toBe("tel");

    expect(fields[3].id).toBe("city-select");
    expect(fields[3].type).toBe("select");
    expect(fields[3].options).toHaveLength(3);

    expect(fields[4].id).toBe("bio-textarea");
    expect(fields[4].type).toBe("textarea");
  });

  it("extracts labels from wrapping label, aria-label, and placeholder", () => {
    document.body.innerHTML = `
      <div>
        <label>
          Postal Code
          <input id="pin" type="text" />
        </label>

        <input id="search" type="text" aria-label="Search Query" />
        <input id="no-label" type="text" placeholder="Enter Occupation" />
      </div>
    `;

    const fields = detectFormFields(document);
    expect(fields[0].label).toBe("Postal Code");
    expect(fields[1].label).toBe("Search Query");
    expect(fields[2].label).toBe("Enter Occupation");
  });

  it("strictly ignores password, hidden, disabled, and sensitive payment controls", () => {
    document.body.innerHTML = `
      <form>
        <input id="user-password" type="password" />
        <input id="hidden-token" type="hidden" value="secret123" />
        <input id="disabled-input" type="text" disabled />
        <input id="readonly-input" type="text" readonly />
        <input id="credit-card" type="text" autocomplete="cc-number" />
        <input id="card-cvv" type="text" name="cvv" />
        <input id="valid-input" type="text" label="Normal Input" />
      </form>
    `;

    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("valid-input");
  });

  it("disambiguates duplicate field names or IDs gracefully", () => {
    document.body.innerHTML = `
      <form>
        <input name="address" type="text" />
        <input name="address" type="text" />
      </form>
    `;

    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].id).toBe("address");
    expect(fields[1].id).toBe("address_1");
  });
});

describe("MozhiFill Browser Extension — Field Filler", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("applies values and dispatches bubbling input and change events for framework forms", () => {
    document.body.innerHTML = `
      <form>
        <input id="fullname" type="text" />
        <textarea id="comments"></textarea>
      </form>
    `;

    const nameInput = document.getElementById("fullname") as HTMLInputElement;
    let inputEventFired = false;
    let changeEventFired = false;

    nameInput.addEventListener("input", (e) => {
      inputEventFired = true;
      expect(e.bubbles).toBe(true);
    });
    nameInput.addEventListener("change", (e) => {
      changeEventFired = true;
      expect(e.bubbles).toBe(true);
    });

    const response = applyFormValues(
      [
        { fieldId: "fullname", value: "Karthik Subramanian" },
        { fieldId: "comments", value: "Looking forward to connecting." },
      ],
      document
    );

    expect(inputEventFired).toBe(true);
    expect(changeEventFired).toBe(true);
    expect(nameInput.value).toBe("Karthik Subramanian");
    expect(response.totalApplied).toBe(2);
    expect(response.totalVerified).toBe(2);
    expect(response.results[0].status).toBe("verified");
    expect(response.results[0].verifiedValue).toBe("Karthik Subramanian");
  });

  it("correctly handles select options matching", () => {
    document.body.innerHTML = `
      <select id="state-select">
        <option value="">Select state</option>
        <option value="TN">Tamil Nadu</option>
        <option value="KL">Kerala</option>
      </select>
    `;

    const selectEl = document.getElementById("state-select") as HTMLSelectElement;

    const res = applyFormValues(
      [{ fieldId: "state-select", value: "Tamil Nadu" }],
      document
    );

    expect(selectEl.value).toBe("TN");
    expect(res.results[0].status).toBe("verified");
  });

  it("reports unsupported or missing fields transparently without crashing", () => {
    document.body.innerHTML = `<div><input id="first_name" type="text" /></div>`;

    const res = applyFormValues(
      [
        { fieldId: "first_name", value: "Ravi" },
        { fieldId: "non_existent_field", value: "some value" },
        { fieldId: "empty_val", value: "" },
      ],
      document
    );

    expect(res.totalApplied).toBe(1);
    expect(res.results[0].status).toBe("verified");
    expect(res.results[1].status).toBe("unsupported");
    expect(res.results[2].status).toBe("skipped");
  });

  it("detects and fills Google Forms style question cards without native IDs", () => {
    document.body.innerHTML = `
      <div role="list">
        <div role="listitem" class="Qr7Oae">
          <div role="heading" aria-level="3">
            <span class="M7eMe">Full Name / முழுப் பெயர் *</span>
          </div>
          <div>
            <input type="text" placeholder="Your answer" aria-labelledby="i1 i4" />
          </div>
        </div>
        <div role="listitem" class="Qr7Oae">
          <div role="heading" aria-level="3">
            <span class="M7eMe">Date of Birth / பிறந்த தேதி *</span>
          </div>
          <div>
            <input type="date" />
          </div>
        </div>
      </div>
    `;

    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].label).toBe("Full Name / முழுப் பெயர்");
    expect(fields[1].label).toBe("Date of Birth / பிறந்த தேதி");

    // Test filling without native element ID
    const fillRes = applyFormValues(
      [
        { fieldId: fields[0].id, value: "Ravi Kumar" },
        { fieldId: fields[1].id, value: "1998-05-12" },
      ],
      document
    );

    expect(fillRes.totalApplied).toBe(2);
    expect(fillRes.totalVerified).toBe(2);
    expect(fillRes.results[0].status).toBe("verified");
    expect(fillRes.results[0].verifiedValue).toBe("Ravi Kumar");
    expect(fillRes.results[1].verifiedValue).toBe("1998-05-12");
  });
});
