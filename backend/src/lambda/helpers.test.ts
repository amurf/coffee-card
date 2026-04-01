import { describe, it, expect } from "vitest"
import { asDto, promiseToLambdaResponse } from "./helpers"

describe("Helpers", () => {
  describe("asDto", () => {
    it("should return null if value is null", () => {
      expect(asDto((val) => val, null)).toBeNull()
    })

    it("should return null if value is undefined", () => {
      expect(asDto((val) => val, undefined)).toBeNull()
    })

    it("should map value using provided function", () => {
      const mapper = (val: string) => val.toUpperCase()
      expect(asDto(mapper, "test")).toBe("TEST")
    })
  })

  describe("promiseToLambdaResponse", () => {
    it("should return 404 if promise resolves to null", async () => {
      const response = await promiseToLambdaResponse(async () => null)
      expect(response.statusCode).toBe(404)
      expect(response.body).toEqual({
        message: "Item not found",
        error: [],
      })
    })

    it("should return 200 with item if promise resolves with data", async () => {
      const data = { id: 1, name: "Test" }
      const response = await promiseToLambdaResponse(async () => data)
      expect(response.statusCode).toBe(200)
      expect(response.body).toBe(data)
    })
  })
})
