import CryptoJS from 'crypto-js';

import util from './util';

type CryptoJSAlgo = 'SHA256' | 'RIPEMD160';

class Enc {
  public static SHORT_HASH_SIZE = 40;
  public static ID_HASH_SIZE = 44;
  public static HASH_SIZE = 64;
  public static HEX_TIME_SIZE = 14;
  public static TIME_HASH_SIZE = 78;
  public static ZERO_ADDRESS = '00000000000000000000000000000000000000000000';

  static string(obj: any) {
    return util.string(obj);
  }

  static crypto(algo: CryptoJSAlgo, string: string) {
    return CryptoJS[algo](string).toString(CryptoJS.enc.Hex);
  }

  static hash(obj: any) {
    return Enc.crypto('SHA256', Enc.string(obj));
  }

  static shortHash(obj: any) {
    return Enc.crypto('RIPEMD160', Enc.hash(obj));
  }

  static checksum(hash: string) {
    return Enc.hash(Enc.hash(hash)).slice(0, 4);
  }

  static hextime(utime?: number) {
    if (typeof utime !== 'number') {
      utime = util.utime();
    }
    return utime.toString(16).padStart(Enc.HEX_TIME_SIZE, '0').slice(0, Enc.HEX_TIME_SIZE);
  }

  static timeHash(obj: any, utime?: number) {
    return Enc.hextime(utime) + Enc.hash(obj);
  }

  static timeHashValidity(hash: string) {
    return Enc.isHex(hash) && hash.length === Enc.TIME_HASH_SIZE;
  }

  static idHash(obj: any) {
    const short_hash = Enc.shortHash(obj);

    return short_hash + Enc.checksum(short_hash);
  }

  static idHashValidity(id_hash: string) {
    return (
      Enc.isHex(id_hash) &&
      id_hash.length === Enc.ID_HASH_SIZE &&
      Enc.checksum(id_hash.slice(0, Enc.SHORT_HASH_SIZE)) === id_hash.slice(-4)
    );
  }

  static spaceId(writer: string, space: string) {
    return Enc.hash([writer, space]);
  }

  static cid(writer: string, space: string) {
    return Enc.spaceId(writer, space);
  }

  static txHash(tx: { [key: string]: any }) {
    return Enc.timeHash(Enc.hash(tx), tx.timestamp);
  }

  static isHex(str: string) {
    return util.isHex(str);
  }

  static parseCode(code: any) {
    if (typeof code === 'string') {
      code = JSON.parse(code);
    }

    if (typeof code.w === 'undefined') {
      return {
        cid: Enc.spaceId(code.writer, code.nonce),
        name: code.name ?? '',
        writer: code.writer ?? '',
        type: code.type ?? '',
        version: code.version ?? '0',
        parameters: code.parameters ?? {},
        nonce: code.nonce ?? '',
      };
    } else {
      return {
        cid: Enc.spaceId(code.w, code.s),
        name: code.n ?? '',
        writer: code.w ?? '',
        type: code.t ?? '',
        version: code.v ?? '0',
        parameters: code.p ?? {},
        nonce: code.s ?? '',
      };
    }
  }
}

export default Enc;
