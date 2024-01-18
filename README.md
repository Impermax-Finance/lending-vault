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

### Permissionless reallocate
It was a design choice to keep the reallocate function permissionless, and have it called whenever whenever someone deposits or withdraws liquidity.
This has pros and cons.

**Pros:**
- When someone deposits, the vault redistributes the new deposited funds optimally.
- When someone withdraws, the vault withdraws funds from the pools with the lowest APRs.
- Anyone who has an interest in the vault offering the highest APR can permissionlessly call the reallocate() function at any time.

**Cons:**
- The transaction cost is higher (not suitable for Ethereum L1).
- It is possible to force the vault to earn a suboptimal APR by calling reallocate in the middle of a flash loan. For instance, by depositing a large amount of funds in a Borrowable pool, calling reallocate(), and then withdrawing those funds right after, the effect would be that the vault would withdraw funds from that Borrowable pool even if it's offering the highest APR, effectively leading the vault to earning a suboptimal APR. However this would be fixed by calling reallocate() right after, and in general this shouldn't be an issue since the number of users having interest in the vault earning an optimal APR should be much higher than the users having interest in the vault earning a suboptimal APR.
