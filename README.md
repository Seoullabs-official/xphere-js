# Xphere.js

Xphere.js is a TypeScript implementation of the Xphere JavaScript API maintained by Seoul Labs.

## Installation

You can install the package using [NPM](https://www.npmjs.com/package/xphere), [Yarn](https://yarnpkg.com/package/xphere), [Pnpm](https://pnpm.io) or [Bun](https://bun.sh)

### Using NPM

```bash
npm install xphere
```

### Using Yarn

```bash
yarn add xphere
```

### Using Pnpm

```bash
pnpm install xphere
```

### Using Bun

```bash
bun add xphere
```

## Getting Started

1. Create a Key Pair

```nodejs
import XPHERE from "xphere";

const keypair = XPHERE.Sign.keyPair();

console.log(keypair);

```

Here is an example output of a generated key pair.

```shell
{
  private_key: 'ad242f114b0bf83860dd9d250de312980c957bd78e01ce02a3e24eefeb3b9b17',
  public_key: 'da2b3f4f5f58c1e3eb05a9c118a04da0ebdb54bfee98dbe75befab43042519df',
  address: '2d6c36dd80ea016c07bea6842522be57dc65927fd04e'
}
```

Now we can use this key pair to create transactions to be sent to the main-net or test-net environment.

2. Query Balance

When creating your own example, please replace the value of 'privateKey' with the key pair you generated.

```javascript
import XPHERE from 'xphere';

const peer = '43.225.140.61';

XPHERE.Rpc.endpoint(peer);

const privateKey = 'c0965d23e2c4d5745cdf2b1a5619e62cdec8f221d8b35555b1061641555aa17d';
const address = XPHERE.Sign.address(XPHERE.Sign.publicKey(privateKey));

const signedRequest = XPHERE.Rpc.signedRequest(
  {
    type: 'GetBalance',
    address: address,
  },
  privateKey,
);

const result = await XPHERE.Rpc.request(signedRequest);
const balance = result.data.balance;

console.log(balance);
```

Now the newly generated address has no balance.

For testing purposes, we have deployed a faucet contract on the test-net.

3. Broadcast a Faucet Transaction

```javascript
import XPHERE from 'xphere';

const peer = '43.225.140.61';

XPHERE.Rpc.endpoint(peer);

const privateKey = 'c0965d23e2c4d5745cdf2b1a5619e62cdec8f221d8b35555b1061641555aa17d';

const signedTransaction = XPHERE.Rpc.signedTransaction(
  {
    type: 'Faucet',
  },
  privateKey,
);

const result = await XPHERE.Rpc.broadcastTransaction(signedTransaction);

console.log(result);
```

After a few seconds, if you check the balance again, you can confirm that the balance has been added.

4. Generate and Broadcast a Transaction

Since the decimal point of XP is 18 digits, you need to add 18 zeros to the 'amount'.

```javascript
import XPHERE from 'xphere';

const peer = '43.225.140.61';

XPHERE.Rpc.endpoint(peer);

const privateKey = 'c0965d23e2c4d5745cdf2b1a5619e62cdec8f221d8b35555b1061641555aa17d';

const signedTransaction = XPHERE.Rpc.signedTransaction(
  {
    type: 'Send',
    to: '900b550aed04bd2a5fff2ed0a71d732595e126632635',
    amount: '125000000000000000000',
  },
  privateKey,
);

const result = await XPHERE.Rpc.broadcastTransaction(signedTransaction);

console.log(result);
```

If you need an example of writing a smart contract, please refer to the following repository.

- Sample contracts: https://github.com/Seoullabs-official/xrc-sample-contract
