# Example of a minimal proxy clone

This is an implementation for [Transparent upgradeable proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#TransparentUpgradeableProxy)

# Installation

1. Clone tis repo:

```shell
git clone https://github.com/ElawBek/transparent-updgradeable-proxy-example.git
```

2. Install NPM packages:

```shell
cd minimal-proxy-clones
npm install
```

# Deployment

localhost:

```shell
npx hardhat node
npx hardhat run scripts/deployV1.js
npx hardhat run scripts/deployV2.js
```

custom network (testnets/mainnets):

```shell
npx hardhat run scripts/deployV1.js --network yourNetwork
npx hardhat run scripts/deployV2.js --network yourNetwork
```

## How the scripts works

deployV1.ts:

1. deploy token contract (implementation)
2. deploy proxyAdmin contract
3. deploy proxy contract with 3 args: implementation address, admin address and data for initialization of the contract through the proxy
4. verify contracts on the scanner
5. mint 1000 tokens to the owner of the proxy (just for a test)

deployV2.ts: (copy your admin and proxy addresses from the scanner)

1. deploy the second version of the token contract (implementation)
2. upgrade implementation through admin contract with 3 args: current proxy address, nextImpl address and data for initialization new methods on the
3. verify v2 impl on the scanner

# Run tests:

transparentProxy.test.ts:

```shell
npx hardhat test test/transparentProxy.test.ts
```

transparentProxyOZUpgrades.test.ts:

```shell
npm run test
```

# Useful Links

1. [The transparent proxy pattern (Openzeppelin blog)](https://blog.openzeppelin.com/the-transparent-proxy-pattern/)
2. [EIP-1967: Standard Proxy Storage Slots](https://eips.ethereum.org/EIPS/eip-1967)
3. [Selector Clashes and Transparent Proxies (Openzeppelin blog)](https://blog.openzeppelin.com/the-state-of-smart-contract-upgrades/#transparent-proxies)
