import { describe, expect, it } from "vitest";
import { customerSchema } from "../../shared/schemas";

const baseCustomer = {
  id: "customer-1",
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z"
};

describe("customer validation", () => {
  it("allows a customer with only a phone number", () => {
    const customer = customerSchema.parse({ ...baseCustomer, phone: " 01700000000 " });
    expect(customer).toMatchObject({ name: "", phone: "01700000000" });
  });

  it("requires a nonblank phone number", () => {
    expect(() => customerSchema.parse({ ...baseCustomer, phone: "   " })).toThrow();
  });
});
