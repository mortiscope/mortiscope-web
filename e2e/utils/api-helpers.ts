import { APIRequestContext, APIResponse } from "@playwright/test";

/**
 * Provides a specialized utility class for managing and simplifying RESTful API interactions.
 */
export class ApiHelper {
  // Initializes the helper with a Playwright request context to perform HTTP operations.
  constructor(private request: APIRequestContext) {}

  /**
   * Executes a GET request to the specified endpoint with optional authentication.
   */
  async get(url: string, token?: string): Promise<APIResponse> {
    // Generate the request headers based on the presence of an authentication token.
    const headers = this.getHeaders(token);
    // Return the response from the asynchronous GET operation.
    return this.request.get(url, { headers });
  }

  /**
   * Executes a POST request to the specified endpoint with a data payload and optional authentication.
   */
  async post(url: string, data: unknown, token?: string): Promise<APIResponse> {
    // Construct the headers object, including the bearer token if provided.
    const headers = this.getHeaders(token);
    // Perform the POST operation with the included data and headers.
    return this.request.post(url, {
      data,
      headers,
    });
  }

  /**
   * Executes a PUT request to the specified endpoint to update resources with a data payload.
   */
  async put(url: string, data: unknown, token?: string): Promise<APIResponse> {
    // Determine the necessary headers for the PUT request.
    const headers = this.getHeaders(token);
    // Perform the PUT operation to modify the resource at the target URL.
    return this.request.put(url, {
      data,
      headers,
    });
  }

  /**
   * Executes a DELETE request to remove a resource at the specified endpoint.
   */
  async delete(url: string, token?: string): Promise<APIResponse> {
    // Generate headers to ensure the requester has the appropriate permissions for deletion.
    const headers = this.getHeaders(token);
    // Execute the DELETE method on the request context.
    return this.request.delete(url, { headers });
  }

  /**
   * Constructs an HTTP header object containing the Authorization bearer token if a token is supplied.
   */
  private getHeaders(token?: string): { [key: string]: string } {
    // If a token exists, return an object containing the Authorization header.
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    // Return an empty object if no token is provided.
    return {};
  }
}
