class Util {
  static time(): number {
    return Math.floor(Date.now() / 1000);
  }

  static utime(): number {
    return Date.now() * 1000;
  }

  static uceiltime(): number {
    return Math.ceil(Date.now() / 1000) * 1000000;
  }

  static randomHexString(num_bytes: number): string {
    let result = '';
    for (let i = 0; i < num_bytes * 2; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  }

  static string(input: any) {
    let s: string;

    if (typeof input === 'object' && input !== null) {
      s = JSON.stringify(input);
    } else {
      s = String(input);
    }

    return Util.stringToUnicode(s.replace(/\//g, '\\/'));
  }

  static stringToByte(str: string) {
    const byte_array = new Uint8Array(str.length);

    for (let i = 0; i < str.length; i++) {
      byte_array[i] = str.charCodeAt(i);
    }

    return byte_array;
  }

  static stringToUnicode(str: string) {
    if (!str) {
      return '';
    }

    return Array.prototype.map
      .call(str, (char: string) => {
        const c = char.charCodeAt(0).toString(16);

        if (c.length > 2) {
          return '\\u' + c;
        }

        return char;
      })
      .join('');
  }

  static byteToHex(byte_array: Uint8Array) {
    if (!byte_array) {
      return '';
    }

    return Array.prototype.map
      .call(byte_array, (byte: number) => {
        return ('0' + (byte & 0xff).toString(16)).slice(-2);
      })
      .join('')
      .toLowerCase();
  }

  static hexToByte(hex: string) {
    if (!hex) {
      return new Uint8Array();
    }

    const bytes: number[] = [];

    for (let i = 0, length = hex.length; i < length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }

    return new Uint8Array(bytes);
  }

  static isHex(input: any) {
    if (typeof input !== 'string') {
      return false;
    }

    const hexPattern = /^[0-9a-fA-F]+$/;
    return hexPattern.test(input) && input.length % 2 === 0;
  }

  static isIP(string: string): boolean {
    const pattern =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:([0-9]{1,5}))?$/;
    return pattern.test(string);
  }

  static isInt(number: number | string): boolean {
    if (typeof number !== 'number' && typeof number !== 'string') {
      return false;
    }
    return Number.isInteger(Number(number)) && !/^0[0-9a-fA-F]+$/.test(String(number));
  }

  static isNumeric(number: number | string): boolean {
    if (typeof number !== 'number' && typeof number !== 'string') {
      return false;
    }
    return !isNaN(Number(number)) && Number(number) !== Infinity && !/^0[0-9a-fA-F]+$/.test(String(number));
  }

  static wrappedEndpoint(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://') || endpoint.startsWith('//')) {
      return endpoint;
    }
    return Util.isIP(endpoint) ? 'http://' + endpoint : '//' + endpoint;
  }

  static shuffle<T>(array: T[]): T[] {
    return array
      .map((v) => ({ v, i: Math.random() }))
      .sort((x, y) => x.i - y.i)
      .map(({ v }) => v);
  }

  static merge<T>(array1: T[], array2: T[]): T[] {
    const m = array1.concat(array2);
    return [...new Set(m)];
  }

  static flatMerge<T>(arrays: T[][]): T[] {
    const m = arrays.flat();
    return [...new Set(m)];
  }

  static randomSlice<T>(array: T[], size: number): T[] {
    return Util.shuffle(array).slice(0, size);
  }

  static applyDecimal(value: string | number, decimal: number): string {
    const bigValue = BigInt(value);
    const divisor = BigInt(10 ** decimal);

    const integerPart = bigValue / divisor;
    const fractionalPart = bigValue % divisor;

    if (fractionalPart === BigInt(0)) {
      return integerPart.toString();
    }

    let fractionalString = fractionalPart.toString().padStart(decimal, '0');

    fractionalString = fractionalString.replace(/0+$/, '');

    return `${integerPart.toString()}.${fractionalString}`;
  }
}

export default Util;
