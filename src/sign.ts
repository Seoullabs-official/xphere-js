import nacl from 'tweetnacl';

import enc from './enc';
import util from './util';

interface KeyPair {
  private_key: string;
  public_key: string;
  address: string;
}

class Sign {
  private static KEY_SIZE = 64;
  private static SIGNATURE_SIZE = 128;

  static keyPair() {
    const pair = nacl.sign.keyPair();

    const result: KeyPair = {
      private_key: util.byteToHex(pair.secretKey).slice(0, Sign.KEY_SIZE),
      public_key: util.byteToHex(pair.publicKey),
      address: Sign.address(util.byteToHex(pair.publicKey)),
    };

    return result;
  }

  static privateKey() {
    return util.byteToHex(nacl.sign.keyPair().secretKey).slice(0, Sign.KEY_SIZE);
  }

  static publicKey(private_key: string) {
    return util.byteToHex(nacl.sign.keyPair.fromSeed(util.hexToByte(private_key)).publicKey);
  }

  static address(public_key: string) {
    return enc.idHash(public_key);
  }

  static addressValidity(address: string) {
    return enc.idHashValidity(address);
  }

  static signature(obj: any, private_key: string) {
    return util.byteToHex(
      nacl.sign.detached(util.stringToByte(enc.string(obj)), util.hexToByte(private_key + Sign.publicKey(private_key))),
    );
  }

  static signatureValidity(obj: any, public_key: string, signature: string) {
    return (
      signature.length === Sign.SIGNATURE_SIZE &&
      enc.isHex(signature) === true &&
      nacl.sign.detached.verify(
        util.stringToByte(enc.string(obj)),
        util.hexToByte(signature),
        util.hexToByte(public_key),
      )
    );
  }

  static keyValidity(key: string) {
    return typeof key === 'string' && /^[a-fA-F0-9]{64}$/.test(key);
  }
}

export default Sign;
