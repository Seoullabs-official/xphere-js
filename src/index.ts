import Enc from './enc';
import Sign from './sign';
import Util from './util';
import Rpc from './rpc';
import SmartContract from './smart-contract';

type XphereType = {
  Enc: typeof Enc;
  Sign: typeof Sign;
  Util: typeof Util;
  Rpc: typeof Rpc;
  SmartContract: typeof SmartContract;
};

const XPHERE: XphereType = {
  Util,
  Enc,
  Sign,
  Rpc,
  SmartContract,
};

export default XPHERE;

export { Util, Enc, Sign, Rpc, SmartContract };
