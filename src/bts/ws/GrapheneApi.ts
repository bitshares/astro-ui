class GrapheneApi {
  ws_rpc: any;
  api_name: string;
  api_id: string;

  constructor(ws_rpc: any, api_name: string) {
    this.ws_rpc = ws_rpc;
    this.api_name = api_name;
    this.api_id = "";
  }

  async init(): Promise<GrapheneApi> {
    const self = this;
    // Propagate failures. The node responds with an `is_allowed: Access
    // denied` assert when it refuses to hand out the named API (e.g. a
    // public node that restricts `database`). Swallowing the error here
    // would leave `api_id` undefined and mask the real failure as a
    // confusing `chain_id: undefined` downstream, so we re-throw.
    const response = await this.ws_rpc.call([1, this.api_name, []]);
    self.api_id = response;
    return self;
  }

  exec(method: string, params: any[]): Promise<any> {
    return this.ws_rpc.call([this.api_id, method, params]).catch((error: any) => {
      throw error;
    });
  }
}

export default GrapheneApi;
