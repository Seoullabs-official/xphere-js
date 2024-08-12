import axios, { AxiosRequestConfig } from 'axios';
import util from './util';
import sign from './sign';
import enc from './enc';

interface RpcResponse {
  code: number;
  msg?: string;
  data?: any;
}

interface PeerResponse {
  peers: string[];
  known_hosts: string[];
}

interface Peer {
  host: string;
  address: string;
}

interface RoundData {
  main: BlockData;
  resource: BlockData;
}

interface BlockData {
  block: {
    height: number;
  };
}

interface SignedData {
  [key: string]: any;
}

type RpcMethod = 'GET' | 'POST';

class Rpc {
  private static _default_peers = [
    'https://xphere-main.zigap.io',
    'https://mello.zigap.io',
    'https://joy.zigap.io',
    'https://jenny.zigap.io',
  ];
  private static _endpoints: string[] | null = null;
  private static _timeout = 30000;
  private static _headers: Record<string, string> = {};
  private static _broadcast_limit = 32;

  static endpoint(endpoint?: string | Record<string, string>): string {
    const endpoints = Rpc.endpoints(endpoint);
    const index = Math.floor(Math.random() * endpoints.length);

    return endpoints[index];
  }

  static endpoints(endpoints?: string | Record<string, string>): string[] {
    if (typeof endpoints === 'object') {
      Rpc._endpoints = Object.values(endpoints);
    } else if (typeof endpoints !== 'undefined') {
      Rpc._endpoints = [String(endpoints)];
    }

    return Rpc._endpoints || Rpc._default_peers;
  }

  static timeout(timeout?: number): number {
    if (typeof timeout === 'number' && timeout > 0) {
      Rpc._timeout = timeout;
    }

    return Rpc._timeout;
  }

  static headers(headers?: Record<string, string>): Record<string, string> {
    if (typeof headers === 'object') {
      Rpc._headers = headers;
    }

    return Rpc._headers;
  }

  static broadcastLimit(limit?: number): number {
    if (typeof limit === 'number' && limit > 0) {
      Rpc._broadcast_limit = limit;
    }

    return Rpc._broadcast_limit;
  }

  static tracker(): Promise<RpcResponse> {
    return Rpc.get('peer', {});
  }

  static trackerFromAll(): Promise<PeerResponse> {
    return new Promise((resolve, reject) => {
      Rpc.all('GET', 'peer', {}).then((r) => {
        const results: PeerResponse = {
          peers: [],
          known_hosts: [],
        };

        r.forEach((item) => {
          if (
            item.data &&
            item.data.peers &&
            item.data.known_hosts &&
            typeof item.data.peers === 'object' &&
            Array.isArray(item.data.known_hosts)
          ) {
            results.peers.push(...(Object.values(item.data.peers) as string[]));
            results.known_hosts.push(...item.data.known_hosts);
          }
        });

        if (results.peers.length > 0) {
          results.peers = util.flatMerge([results.peers]);
          results.known_hosts = util.flatMerge([results.known_hosts]);
          resolve(results);
        } else {
          reject(r);
        }
      });
    });
  }

  static peer(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      Rpc.tracker()
        .then((r) => resolve(Object.values(r.data.peers)))
        .catch(reject);
    });
  }

  static peerFromAll(): Promise<Peer[]> {
    return new Promise((resolve, reject) => {
      Rpc.all('GET', 'peer', {}).then((r) => {
        let peers: Peer[] = [];

        r.forEach((item) => {
          if (item.data && item.data.peers) {
            peers.push(...(Object.values(item.data.peers) as Peer[]));
          }
        });

        if (peers.length > 0) {
          peers = util.flatMerge([peers]);
          resolve(peers);
        } else {
          reject(r);
        }
      });
    });
  }

  static ping(): Promise<RpcResponse> {
    return Rpc.get('ping', {});
  }

  static round(): Promise<RpcResponse> {
    return Rpc.get('round', { chain_type: 'all' });
  }

  static bestRound(): Promise<RoundData> {
    return new Promise((resolve, reject) => {
      Rpc.all('GET', 'round', { chain_type: 'all' })
        .then((r) => {
          const max_mheight = Math.max(...r.map((obj) => (obj.data ? obj.data.main.block.height : 0)));
          const max_rheight = Math.max(...r.map((obj) => (obj.data ? obj.data.resource.block.height : 0)));

          const max_mblock = r.find((obj) => obj.data && obj.data.main.block.height === max_mheight);
          const max_rblock = r.find((obj) => obj.data && obj.data.resource.block.height === max_rheight);

          if (!max_mblock || !max_rblock) {
            reject({
              main: null,
              resource: null,
            });
          } else {
            resolve({
              main: max_mblock.data.main.block,
              resource: max_rblock.data.resource.block,
            });
          }
        })
        .catch(reject);
    });
  }

  static signedRequest(item: any, private_key?: string): SignedData {
    return Rpc.signedData(item, private_key, 'request');
  }

  static simpleRequest(item: any): { request: any } {
    return { request: item };
  }

  static signedTransaction(item: any, private_key?: string): SignedData {
    return Rpc.signedData(item, private_key, 'transaction');
  }

  static request(signed_request: any): Promise<RpcResponse> {
    return Rpc.get('request', signed_request);
  }

  static raceRequest(signed_request: any, condition: (data: any) => boolean = () => true): Promise<RpcResponse> {
    return Rpc.race('GET', 'request', signed_request, condition);
  }

  static sendTransaction(signed_transaction: any): Promise<RpcResponse> {
    return Rpc.post('sendtransaction', signed_transaction);
  }

  static sendTransactionToAll(signed_transaction: any): Promise<RpcResponse[]> {
    return Rpc.all('POST', 'sendtransaction', signed_transaction);
  }

  static broadcastTransaction(signed_transaction: any): Promise<RpcResponse> {
    return new Promise((resolve, reject) => {
      Rpc.peerFromAll()
        .then((peers: Peer[]) => {
          const limit = Rpc.broadcastLimit() - Rpc.endpoints().length;
          const targets = util.merge(
            Rpc.endpoints(),
            util.randomSlice(peers, limit).map((o) => o.host),
          );

          Rpc._all(
            targets,
            'POST',
            'sendtransaction',
            signed_transaction,
            () => true,
            (r) => {
              const f = r.filter((o) => o.code === 200);

              if (f.length > 0) {
                resolve(f[0]);
              } else {
                const m = Math.max(...r.map((o) => o.code));
                const f = r.filter((o) => o.code === m);

                if (f.length > 0) {
                  reject(f[0]);
                } else {
                  reject(r[0]);
                }
              }
            },
          );
        })
        .catch(reject);
    });
  }

  static estimatedFee(signed_transaction: any): Promise<number> {
    const length = JSON.stringify(signed_transaction).length;

    return new Promise((resolve, reject) => {
      Rpc.race('POST', 'weight', signed_transaction, util.isInt)
        .then((r) => {
          const weight = parseInt(r.data || '0');
          const fee = weight === length ? (length + 336) * 1000000000 : weight * 1000000000;
          resolve(fee);
        })
        .catch(reject);
    });
  }

  private static get(path: string, data: any): Promise<RpcResponse> {
    return Rpc.fetch('GET', path, data);
  }

  private static post(path: string, data: any): Promise<RpcResponse> {
    return Rpc.fetch('POST', path, data);
  }

  private static fetch(method: RpcMethod, path: string, data: any): Promise<RpcResponse> {
    return new Promise<RpcResponse>((resolve, reject) => {
      const item = Rpc.axiosItem(Rpc.endpoint(), method, path, data, Rpc.headers());
      axios(item)
        .then((r) => {
          if (r.data && r.data.code) {
            resolve(r.data);
          } else {
            reject({ code: 901, msg: 'Invalid response parameter' });
          }
        })
        .catch((error) => {
          if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            reject({ code: 408, msg: 'Request timed out' });
          } else if (error.response && error.response.data && error.response.data.code) {
            resolve(error.response.data);
          } else if (error.response && error.response.status && error.response.statusText && error.response.data) {
            reject({ code: error.response.status, msg: error.response.statusText, data: error.response.data });
          } else {
            reject(error);
          }
        });
    });
  }

  private static signedData(item: any, private_key: string | null = null, type: string = 'transaction'): any {
    if (!private_key) {
      private_key = sign.privateKey();
    }

    if (!sign.keyValidity(private_key)) {
      console.error('Invalid private key: ' + private_key);
      return {};
    }

    let data: any = {};

    item.from = sign.address(sign.publicKey(private_key));

    if (typeof item.timestamp !== 'number') {
      item.timestamp = util.utime() + (type === 'transaction' ? 2000000 : 0);
    }

    data[type] = item;
    data.public_key = sign.publicKey(private_key);
    data.signature = sign.signature(enc.txHash(item), private_key);

    return data;
  }

  static axiosItem(endpoint: string, method: string, path: string, data: any, headers?: any): AxiosRequestConfig {
    let item: any = {
      method: method,
      url: `${util.wrappedEndpoint(endpoint)}/${path}`,
      timeout: Rpc.timeout(),
    };

    if (typeof headers === 'object' && Object.keys(headers).length > 0) {
      item.headers = headers;
    }

    if (method === 'GET') {
      let params: string[] = [];

      for (let key in data) {
        params.push(`${key}=${util.string(data[key])}`);
      }

      item.url = item.url + (Object.keys(data).length === 0 ? '' : '?' + params.join('&'));
    } else {
      let params = new FormData();

      for (let key in data) {
        params.set(key, util.string(data[key]));
      }

      item.data = params;
    }

    return item;
  }

  static race(
    method: string,
    path: string,
    data: any,
    condition: (data: any) => boolean = () => true,
  ): Promise<RpcResponse> {
    const endpoints = Rpc.endpoints();
    return new Promise((resolve, reject) => {
      Rpc._race(endpoints, method, path, data, condition, resolve, reject);
    });
  }

  private static _race(
    endpoints: string[],
    method: string,
    path: string,
    data: any,
    condition: (data: any) => boolean = () => false,
    success: (data: any) => void = () => {},
    fallback: (data?: any) => void = () => {},
  ) {
    if (!Array.isArray(endpoints) || endpoints.length === 0) {
      fallback();
    }

    try {
      let count = 0;
      let results: any, item: any, cancel: any;
      let token = new axios.CancelToken((c) => (cancel = c));

      let tasks = endpoints.map((endpoint) => {
        item = Rpc.axiosItem(endpoint, method, path, data, Rpc.headers());
        item.cancelToken = token;

        axios(item)
          .then((r) => {
            if (r.data && r.data.code && condition(r.data.data)) {
              success(r.data);
              cancel();
            } else {
              count++;
            }
          })
          .catch((error) => {
            count++;

            if (!results) {
              if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                results = { code: 408, msg: 'Request timed out' };
              } else if (error.response && error.response.data && error.response.data.code) {
                results = error.response.data;
              } else if (error.response && error.response.status) {
                results = { code: error.response.status, msg: error.response.statusText, data: error.response.data };
              } else {
                results = error;
              }
            }
          })
          .finally(() => count >= endpoints.length && fallback(results));
      });

      Promise.race(tasks).then();
    } catch (e) {
      console.error(e);
    }
  }

  static all(
    method: string,
    path: string,
    data: any,
    condition: (data: any) => boolean = () => true,
  ): Promise<RpcResponse[]> {
    const endpoints = Rpc.endpoints();
    return new Promise((resolve) => {
      Rpc._all(endpoints, method, path, data, condition, resolve);
    });
  }

  private static _all(
    endpoints: string[],
    method: string,
    path: string,
    data: any,
    condition: (data: any) => boolean = () => true,
    success: (data: any) => void = () => {},
    fallback: (data?: any) => void = () => {},
  ) {
    if (!Array.isArray(endpoints) || endpoints.length === 0) {
      fallback();
    }

    try {
      let results: any[] = [];
      let item: any;
      let tasks = endpoints.map((endpoint) => {
        item = Rpc.axiosItem(endpoint, method, path, data, Rpc.headers());

        axios(item)
          .then((r) => {
            if (r.data && r.data.code && condition(r.data.data)) {
              results.push({ endpoint: endpoint, code: r.data.code, data: r.data.data });
            } else {
              results.push({ endpoint: endpoint, msg: 'Condition not met' });
            }
          })
          .catch((error) => {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
              results.push({ endpoint: endpoint, code: 408, msg: 'Request timed out' });
            } else if (error.response && error.response.data && error.response.data.code) {
              let r = error.response.data;
              r.endpoint = endpoint;
              results.push(r);
            } else if (error.response && error.response.status) {
              results.push({
                endpoint: endpoint,
                code: error.response.status,
                msg: error.response.statusText,
                data: error.response.data,
              });
            } else {
              results.push({ endpoint: endpoint, error: error });
            }
          })
          .finally(() => {
            if (results.length >= endpoints.length) {
              success(results);
            }
          });
      });

      Promise.race(tasks).then();
    } catch (e) {
      console.error(e);
    }
  }
}

export default Rpc;
