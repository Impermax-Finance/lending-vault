### Contracts architecture

![lending-vault-contracts-diagram](https://github.com/Impermax-Finance/lending-vault/assets/48289911/8924bfc8-e336-4e89-88fc-2ee174c989d5)

### LendingVault contract scope
- LendingVault implements a strategy to distribute funds accross a list of N Borrowable contracts (Impermax lending pools) in a optimal way.
- The vault reallocates funds whenever someone mint() or redeem() tokens, or when the reallocate() function is called.
- The reallocate strategy is based on supply APR rebalance. The vault allocates funds accross Borrowable contracts with the highest supply APR, in such a way that a the end of the execution the supply APR of the vaults to which it has added funds is the same. In the long term this strategy should rebalance APRs and utilization rates across different lending pools.
- The **Available Liquidity** calculated by the LendingVaultWatcher periphery contract is the parameter the indicates how much liquidity can be withdrawn from the vault at any given point in time.
- It is expected that Available Liquidity < Vault TVL when there are enough funds borrowed. In this case users may be temporarily unable to withdraw all of their funds if the Available Liquidity < User's Supplied Balance.

### Contract usage and safety precautions
- Currently the LendingVault contract assumes that all Borrowable contracts are solvent. There isn't a mechanism in place to realize a loss in case one of the Borrowable contracts become insolvent, therefore the admin should add to the vault only Borrowable contracts considered safe.
- Due to gas limit restrictions there is a hard cap to the number of N (MAX_BORROWABLE_LENGTH). By default this parameter is set to 10, but this can be lowered or increased depending on the gas limit on the deployment chain.
