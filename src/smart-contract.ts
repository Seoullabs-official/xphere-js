import enc from './enc';
import rpc from './rpc';
import sign from './sign';
import util from './util';

interface ParameterData {
  name: string;
  type: 'string' | 'int' | 'array' | 'bool' | 'double' | 'any';
  maxlength: number;
  requirements: boolean;
  cases?: any[] | null;
}

interface MethodData {
  type?: 'contract' | 'request';
  t?: 'contract' | 'request';
  machine?: string;
  m?: string;
  name?: string;
  n?: string;
  version?: string;
  v?: string;
  space?: string;
  s?: string;
  writer?: string;
  w?: string;
  parameters?: { [key: string]: ParameterData };
  p?: { [key: string]: ParameterData };
  executions?: any[];
  e?: any[];
}

interface LegacyMethodData {
  type?: 'contract' | 'request';
  name?: string;
  version?: string;
  nonce?: string;
  space?: string;
  writer?: string;
  parameters?: { [key: string]: ParameterData };
  conditions?: any[];
  updates?: any[];
  response?: any[];
}

class SmartContract {
  private static readonly ZERO_ADDRESS = '00000000000000000000000000000000000000000000';

  static Operator = {
    /* BasicOperator */
    legacy_condition: (abi: any, err_msg: string = 'Conditional error') => [abi, err_msg],
    condition: (abi: any, err_msg: string = 'Conditional error') => ({ $condition: [abi, err_msg] }),
    response: (abi: any) => ({ $response: [abi] }),
    weight: () => ({ $weight: [] }),
    if: (condition: boolean = false, ifTrue: any = null, ifFalse: any = null) => ({
      $if: [condition, ifTrue, ifFalse],
    }),
    and: (vars: any[] = []) => ({ $and: vars }),
    or: (vars: any[] = []) => ({ $or: vars }),
    get: (obj: any = {}, key: string = '') => ({ $get: [obj, key] }),

    /* ArithmeticOperator */
    add: (vars: any[] = []) => ({ $add: vars }),
    sub: (vars: any[] = []) => ({ $sub: vars }),
    mul: (vars: any[] = []) => ({ $mul: vars }),
    div: (vars: any[] = []) => ({ $div: vars }),
    precise_add: (left: any = null, right: any = null, scale: number = 0) => ({ $precise_add: [left, right, scale] }),
    precise_sub: (left: any = null, right: any = null, scale: number = 0) => ({ $precise_sub: [left, right, scale] }),
    precise_mul: (left: any = null, right: any = null, scale: number = 0) => ({ $precise_mul: [left, right, scale] }),
    precise_div: (left: any = null, right: any = null, scale: number = 0) => ({ $precise_div: [left, right, scale] }),
    scale: (value: any = null) => ({ $scale: [value] }),

    /* CastOperator */
    get_type: (obj: any) => ({ $get_type: [obj] }),
    is_numeric: (vars: any[] = []) => ({ $is_numeric: vars }),
    is_int: (vars: any[] = []) => ({ $is_int: vars }),
    is_string: (vars: any[] = []) => ({ $is_string: vars }),
    is_null: (vars: any[] = []) => ({ $is_null: vars }),
    is_bool: (vars: any[] = []) => ({ $is_bool: vars }),
    is_array: (vars: any[] = []) => ({ $is_array: vars }),
    is_double: (vars: any[] = []) => ({ $is_double: vars }),

    /* ComparisonOperator */
    eq: (left: any = 0, right: any = 0) => ({ $eq: [left, right] }),
    ne: (left: any = 0, right: any = 0) => ({ $ne: [left, right] }),
    gt: (left: any = 0, right: any = 0) => ({ $gt: [left, right] }),
    lt: (left: any = 0, right: any = 0) => ({ $lt: [left, right] }),
    gte: (left: any = 0, right: any = 0) => ({ $gte: [left, right] }),
    lte: (left: any = 0, right: any = 0) => ({ $lte: [left, right] }),
    in: (target: any = null, cases: any[] = []) => ({ $in: [target, cases] }),

    /* ReadWriteOperator */
    load_param: (vars: string | any[]) => (typeof vars === 'string' ? { $load_param: [vars] } : { $load_param: vars }),
    read_universal: (attr: any = null, key: any = null, defaultValue: any = null) => ({
      $read_universal: [attr, key, defaultValue],
    }),
    read_local: (attr: any = null, key: any = null, defaultValue: any = null) => ({
      $read_local: [attr, key, defaultValue],
    }),
    write_universal: (attr: any = null, key: any = null, value: any = null) => ({
      $write_universal: [attr, key, value],
    }),
    write_local: (attr: any = null, key: any = null, value: any = null) => ({ $write_local: [attr, key, value] }),

    /* UtilOperator */
    concat: (vars: any[] = []) => ({ $concat: vars }),
    strlen: (value: string = '') => ({ $strlen: [value] }),
    reg_match: (reg: any = null, value: string = '') => ({ $reg_match: [reg, value] }),
    encode_json: (target: any = null) => ({ $encode_json: [target] }),
    decode_json: (target: string = '') => ({ $decode_json: [target] }),
    hash: (...vars: any[]) => ({ $hash: [vars] }),
    short_hash: (...vars: any[]) => ({ $short_hash: [vars] }),
    id_hash: (...vars: any[]) => ({ $id_hash: [vars] }),
    sign_verify: (obj: any = null, public_key: string = '', signature: string = '') => ({
      $sign_verify: [obj, public_key, signature],
    }),

    /* ChainOperator */
    get_block: (target: any, full: boolean) => ({ $get_block: [target, full] }),
    get_resource_block: (target: any, full: boolean) => ({ $get_resource_block: [target, full] }),
    get_transaction: (target: any) => ({ $get_transaction: [target] }),
    list_universal: (attr: any, page: any, count: any) => ({ $list_universal: [attr, page, count] }),
  };

  static Contract = class {
    public _methods: { [key: string]: any } = {};
    public _writer: string;
    public _nonce: string;

    constructor(writer: string, nonce: string) {
      this._writer = writer;
      this._nonce = nonce;
    }

    public method(name: string) {
      return this._methods[name];
    }

    public setWriter(writer: string) {
      if (typeof writer !== 'undefined') {
        if (typeof writer === 'string' && (sign.addressValidity(writer) || writer === SmartContract.ZERO_ADDRESS)) {
          this._writer = writer;
        } else {
          console.error('Invalid writer address.');
        }
      }
    }

    public setNonce(nonce: string) {
      if (typeof nonce !== 'undefined') {
        if (typeof nonce === 'string') {
          this._nonce = nonce;
        } else {
          console.error("The 'nonce' parameter should be of string.");
        }
      }
    }

    public methods(full: boolean = false) {
      const methods: { [key: string]: any } = {};

      if (full) {
        for (const i in this._methods) {
          methods[i] = this._methods[i].compile();
        }
      } else {
        for (const i in this._methods) {
          methods[i] = this._methods[i].type();
        }
      }

      return methods;
    }

    public addMethod(data: any) {
      data.writer(this._writer);
      data.nonce(this._nonce);
      this._methods[data.name()] = data;
    }

    public publish(private_key: string) {
      this.register(private_key, 'Publish');
    }

    public register(private_key: string, type: string = 'Register') {
      const broadcast = (method: any) => {
        const timestamp = util.utime() + 1000000;
        const item = { type: type, code: method.compile(), timestamp: timestamp };
        const thash = enc.txHash(item);
        const signed_tx = rpc.signedTransaction(item, private_key);

        const check = () => {
          console.log('Checking results... ' + thash);
          rpc.round().then((rs: any) => {
            if (typeof rs.data !== 'undefined' && rs.data.main.block.s_timestamp > timestamp) {
              rpc
                .request(
                  rpc.signedRequest(
                    {
                      type: 'GetCode',
                      ctype: method.type(),
                      target: method.mid(),
                    },
                    sign.privateKey(),
                  ),
                )
                .then((code: any) => {
                  for (const i in code.data) {
                    if (code.data[i] === null) {
                      console.log('Failed. Resending code... ' + thash);
                      broadcast(method);
                    } else {
                      console.log('Success! ' + thash);
                    }
                  }
                });
            } else {
              setTimeout(check, 2000);
            }
          });
        };

        rpc
          .broadcastTransaction(signed_tx)
          .then((rs: any) => {
            if (rs.code === 200) {
              console.log(rs.data);
              setTimeout(check, 2000);
            } else if (rs.code !== 999) {
              console.log('Failed. Resending code... ' + thash);
              broadcast(method);
            } else {
              console.dir(rs);
            }
          })
          .catch((e: any) => {
            console.dir(e);
          });
      };

      for (const i in this._methods) {
        broadcast(this._methods[i]);
      }
    }
  };

  static Method = class {
    public _type: string = 'request';
    public _machine: string = '0.2.0';
    public _name: string = '';
    public _version: string = '';
    public _space: string = '';
    public _writer: string = '';
    public _parameters: any = {};
    public _executions: any[] = [];

    constructor(data: MethodData) {
      if (typeof data === 'object') {
        if (typeof data.type !== 'undefined') {
          this._type = typeof data.type === 'string' && data.type === 'contract' ? 'contract' : 'request';
        }

        if (typeof data.t !== 'undefined') {
          this._type = typeof data.t === 'string' && data.t === 'contract' ? 'contract' : 'request';
        }

        if (typeof data.machine !== 'undefined') {
          if (typeof data.machine === 'string') {
            this._machine = data.machine;
          } else {
            console.error("The 'machine' parameter should be of string.");
          }
        }

        if (typeof data.m !== 'undefined') {
          if (typeof data.m === 'string') {
            this._machine = data.m;
          } else {
            console.error("The 'machine' parameter should be of string.");
          }
        }

        if (typeof data.name !== 'undefined') {
          if (typeof data.name === 'string') {
            this._name = data.name;
          } else {
            console.error("The 'name' parameter should be of string.");
          }
        }

        if (typeof data.n !== 'undefined') {
          if (typeof data.n === 'string') {
            this._name = data.n;
          } else {
            console.error("The 'name' parameter should be of string.");
          }
        }

        if (typeof data.version !== 'undefined') {
          if (typeof data.version === 'string') {
            this._version = data.version;
          } else {
            console.error("The 'version' parameter should be of string.");
          }
        }

        if (typeof data.v !== 'undefined') {
          if (typeof data.v === 'string') {
            this._version = data.v;
          } else {
            console.error("The 'version' parameter should be of string.");
          }
        }

        if (typeof data.space !== 'undefined') {
          if (typeof data.space === 'string') {
            this._space = data.space;
          } else {
            console.error("The 'space' parameter should be of string.");
          }
        }

        if (typeof data.s !== 'undefined') {
          if (typeof data.s === 'string') {
            this._space = data.s;
          } else {
            console.error("The 'space' parameter should be of string.");
          }
        }

        if (typeof data.writer !== 'undefined') {
          if (
            typeof data.writer === 'string' &&
            (sign.addressValidity(data.writer) || data.writer === SmartContract.ZERO_ADDRESS)
          ) {
            this._writer = data.writer;
          } else {
            console.error('Invalid writer address.');
          }
        }

        if (typeof data.w !== 'undefined') {
          if (typeof data.w === 'string' && (sign.addressValidity(data.w) || data.w === SmartContract.ZERO_ADDRESS)) {
            this._writer = data.w;
          } else {
            console.error('Invalid writer address.');
          }
        }

        if (typeof data.parameters !== 'undefined') {
          if (typeof data.parameters === 'object' && SmartContract.parametersValidity(data.parameters)) {
            this._parameters = data.parameters;
          } else {
            console.error('Invalid parameters.');
          }
        }

        if (typeof data.p !== 'undefined') {
          if (typeof data.p === 'object' && SmartContract.parametersValidity(data.p)) {
            this._parameters = data.p;
          } else {
            console.error('Invalid parameters.');
          }
        }

        if (typeof data.executions !== 'undefined') {
          if (typeof data.executions === 'object') {
            this._executions = data.executions;
          } else {
            console.error('Invalid executions.');
          }
        }

        if (typeof data.e !== 'undefined') {
          if (typeof data.e === 'object') {
            this._executions = data.e;
          } else {
            console.error('Invalid executions.');
          }
        }
      }
    }

    public cid(): string {
      return enc.cid(this.writer(), this.space());
    }

    public mid(): string {
      return enc.hash([this.writer(), this.space(), this.name()]);
    }

    public type(type?: string): string {
      if (typeof type !== 'undefined') {
        this._type = type === 'contract' ? 'contract' : 'request';
      }
      return this._type;
    }

    public machine(machine?: string): string {
      if (typeof machine !== 'undefined') {
        if (typeof machine === 'string') {
          this._machine = machine;
        } else {
          console.error("The 'machine' parameter should be of string.");
        }
      }
      return this._machine;
    }

    public name(name?: string): string {
      if (typeof name !== 'undefined') {
        if (typeof name === 'string') {
          this._name = name;
        } else {
          console.error("The 'name' parameter should be of string.");
        }
      }
      return this._name;
    }

    public version(version?: string): string {
      if (typeof version !== 'undefined') {
        if (typeof version === 'string') {
          this._version = version;
        } else {
          console.error("The 'version' parameter should be of string.");
        }
      }
      return this._version;
    }

    public nonce(nonce?: string): string {
      if (typeof nonce !== 'undefined') {
        if (typeof nonce === 'string') {
          this._space = nonce;
        } else {
          console.error("The 'space' parameter should be of string.");
        }
      }
      return this._space;
    }

    public space(nonce?: string): string {
      return this.nonce(nonce);
    }

    public writer(writer?: string): string {
      if (typeof writer !== 'undefined') {
        if (sign.addressValidity(writer) || writer === SmartContract.ZERO_ADDRESS) {
          this._writer = writer;
        } else {
          console.error('Invalid writer address.');
        }
      }
      return this._writer;
    }

    public parameters(parameters?: any): any {
      if (typeof parameters !== 'undefined') {
        if (typeof parameters === 'object' && SmartContract.parametersValidity(parameters)) {
          this._parameters = parameters;
        } else {
          console.error('Invalid parameters.');
        }
      }
      return this._parameters;
    }

    public executions(executions?: any): any[] {
      if (typeof executions === 'object') {
        this._executions = executions;
      }
      return this._executions;
    }

    public addParameter(data: any): void {
      if (typeof data.default === 'undefined') data.default = null;
      if (typeof data.cases === 'undefined') data.cases = null;
      if (typeof data === 'object' && SmartContract.parameterValidity(data)) {
        this._parameters[data.name] = data;
      } else {
        console.error('Invalid parameter.');
      }
    }

    public addExecution(data: any): void {
      this._executions.push(data);
    }

    public compile(): string {
      if (Object.keys(this._parameters).length === 0) {
        this._parameters = [];
      }

      const json = JSON.stringify({
        t: this._type,
        m: this._machine,
        n: this._name,
        v: this._version,
        s: this._space,
        w: this._writer,
        p: this._parameters,
        e: this._executions,
      });

      return json.replaceAll('/', '\\/');
    }
  };

  static LegacyMethod = class {
    public _type: 'request' | 'contract' = 'request';
    public _name: string = '';
    public _version: string = '';
    public _space: string = '';
    public _writer: string = '';
    public _parameters: { [key: string]: any } = {}; // 구체적인 타입 정의가 필요할 수 있음
    public _conditions: any[] = [];
    public _updates: any[] = [];
    public _response: any[] = [];

    constructor(data: LegacyMethodData) {
      if (typeof data === 'object') {
        if (data.type) {
          this._type = data.type === 'contract' ? 'contract' : 'request';
        }

        if (data.name) {
          if (typeof data.name === 'string') {
            this._name = data.name;
          } else {
            console.error("The 'name' parameter should be of string.");
          }
        }

        if (data.version) {
          if (typeof data.version === 'string') {
            this._version = data.version;
          } else {
            console.error("The 'version' parameter should be of string.");
          }
        }

        if (data.nonce) {
          if (typeof data.nonce === 'string') {
            this._space = data.nonce;
          } else {
            console.error("The 'nonce' parameter should be of string.");
          }
        }

        if (data.space) {
          if (typeof data.space === 'string') {
            this._space = data.space;
          } else {
            console.error("The 'space' parameter should be of string.");
          }
        }

        if (data.writer) {
          if (
            typeof data.writer === 'string' &&
            (sign.addressValidity(data.writer) || data.writer === SmartContract.ZERO_ADDRESS)
          ) {
            this._writer = data.writer;
          } else {
            console.error('Invalid writer address.');
          }
        }

        if (data.parameters) {
          if (typeof data.parameters === 'object' && SmartContract.parametersValidity(data.parameters)) {
            this._parameters = data.parameters;
          } else {
            console.error('Invalid parameters.');
          }
        }

        if (data.conditions) {
          if (Array.isArray(data.conditions)) {
            this._conditions = data.conditions;
          } else {
            console.error('Invalid conditions.');
          }
        }

        if (data.updates) {
          if (Array.isArray(data.updates)) {
            this._updates = data.updates;
          } else {
            console.error('Invalid updates.');
          }
        }

        if (data.response) {
          if (Array.isArray(data.response)) {
            this._response = data.response;
          } else {
            console.error('Invalid response.');
          }
        }
      }
    }

    public cid(): string {
      return enc.cid(this._writer, this._space);
    }

    public mid(): string {
      return enc.idHash([this._name, this._space]) + '00000000000000000000';
    }

    public type(type?: 'request' | 'contract'): 'request' | 'contract' {
      if (type) {
        this._type = type === 'contract' ? 'contract' : 'request';
      }
      return this._type;
    }

    public name(name?: string): string {
      if (name) {
        if (typeof name === 'string') {
          this._name = name;
        } else {
          console.error("The 'name' parameter should be of string.");
        }
      }
      return this._name;
    }

    public version(version?: string): string {
      if (version) {
        if (typeof version === 'string') {
          this._version = version;
        } else {
          console.error("The 'version' parameter should be of string.");
        }
      }
      return this._version;
    }

    public nonce(nonce?: string): string {
      if (nonce) {
        if (typeof nonce === 'string') {
          this._space = nonce;
        } else {
          console.error("The 'nonce' parameter should be of string.");
        }
      }
      return this._space;
    }

    public space(nonce?: string): string {
      return this.nonce(nonce);
    }

    public writer(writer?: string): string {
      if (writer) {
        if (typeof writer === 'string' && (sign.addressValidity(writer) || writer === SmartContract.ZERO_ADDRESS)) {
          this._writer = writer;
        } else {
          console.error('Invalid writer address.');
        }
      }
      return this._writer;
    }

    public parameters(parameters?: { [key: string]: any }): { [key: string]: any } {
      if (parameters) {
        if (typeof parameters === 'object' && SmartContract.parametersValidity(parameters)) {
          this._parameters = parameters;
        } else {
          console.error('Invalid parameters.');
        }
      }
      return this._parameters;
    }

    public conditions(conditions?: any[]): any[] {
      if (conditions) {
        if (Array.isArray(conditions)) {
          this._conditions = conditions;
        } else {
          console.error('Invalid conditions.');
        }
      }
      return this._conditions;
    }

    public updates(updates?: any[]): any[] {
      if (updates) {
        if (Array.isArray(updates)) {
          this._updates = updates;
        } else {
          console.error('Invalid updates.');
        }
      }
      return this._updates;
    }

    public response(response?: any[]): any[] {
      if (response) {
        if (Array.isArray(response)) {
          this._response = response;
        } else {
          console.error('Invalid response.');
        }
      }
      return this._response;
    }

    public addParameter(data: any): void {
      if (typeof data.default === 'undefined') data.default = null;
      if (typeof data.cases === 'undefined') data.cases = null;
      if (typeof data === 'object' && SmartContract.parameterValidity(data)) {
        this._parameters[data.name] = data;
      } else {
        console.error('Invalid parameter.');
      }
    }

    public addCondition(data: any): void {
      this._conditions.push(data);
    }

    public addUpdate(data: any): void {
      this._updates.push(data);
    }

    public compile(): string {
      const json = JSON.stringify({
        type: this._type,
        name: this._name,
        version: this._version,
        nonce: this._space,
        writer: this._writer,
        parameters: Object.keys(this._parameters).length === 0 ? [] : this._parameters,
        conditions: this._conditions,
        updates: this._updates,
        response: this._response,
      });

      return json.replaceAll('/', '\\/');
    }
  };

  static parametersValidity(object: { [key: string]: ParameterData }): boolean {
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        if (!SmartContract.parameterValidity(object[key])) {
          return false;
        }
      }
    }
    return true;
  }

  static parameterValidity(data: ParameterData): boolean {
    const _name = typeof data.name === 'string';
    const _type = typeof data.type === 'string' && SmartContract.typeValidity(data.type);
    const _maxlength = typeof data.maxlength === 'number';
    const _requirements = typeof data.requirements === 'boolean';
    const _cases = typeof data.cases === 'undefined' || typeof data.cases === 'object' || data.cases === null;

    return _name && _type && _maxlength && _requirements && _cases;
  }

  static typeValidity(type: string): boolean {
    return ['string', 'int', 'array', 'bool', 'double', 'any'].includes(type);
  }
}

export default SmartContract;
