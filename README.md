# Poseidon DAO Token ERC20-ERC1155

This project is part of the whole Poseidon DAO focused on the hybrid token management system between the standard token ERC20 and ERC1155.

##  Hybrid Burning System

Poseidon Token is a standard ERC20 Token connected to an ERC1155 Token thanks to a **hybrid burning system** where we can burn an amount of token to receive a specific amount of NFT.

There is a ratio between both that specifies the amount of ERC20 Token we need to be able to reach one single NFT and it can be set running the function:
```
 # ERC20_PDN.sol

 ...

    function setERC1155(address _ERC1155Address, uint _ID_ERC1155, uint _ratio) public onlyOwner returns(bool)

 ...
```
This function, runnable only from admin, sets:

1. The ERC1155 Address linked to the ERC20 Address
2. The ID of the ERC1155
3. The ratio

Last parameter is defined as follows:

## $R=ratio=n_{token}/n_{nft}=n_t/n_f=costant$

The smart contract will consider only the effective amount of token that can be burnt, it means that:

## $R=n_t/n_f=(n_t+q)/n_f$

being:

## $1 \leq q \leq n_t-1$

In other words the $q$ amount will not be taken on the burning system.

For example, if we have a ratio of 5000:

| Poseidon NFT | Token Effectively Burnt | NFT Received |
| :---: | :---: | :---: |
|5000|5000|1|
|15000|15000|3|
|17000|15000|3|
|25000|25000|5|
|26555|25000|5|

To access to this burning system we have to run the 
```
 # ERC20_PDN.sol

 ...

    function burnAndReceiveNFT(uint _amount) public returns(bool)

 ...
```

The *_amount* doesn't consider the decimals (equals to 18), so whenever we burn tokens, we are burning an amount multiply for $10^{18}$.
Same for the ratio, we are considering only integer part of the token itself, so, whenever we are talking about a ratio, effectively we multiply the amount for $10^{18}$.

In the other smart contract, instead, we define the ERC20 address in the initialization. In this way they are able to comunicate in a exclusive way cause the actor that is allowed to mint is only the ERC20 address previously declared.

```
 # ERC1155_PDN.sol

 ...

    function mint(address _to, uint _id, uint _amount, bytes memory _data) public returns(bool){
        require(msg.sender == ERC20Address, "ADDRESS_DISMATCH");
        require(_amount > 0, "CANT_SET_NULL_AMOUNT");
        require(_to != address(0), "CANT_SET_NULL_ADDRESS");
        _mint(_to, _id, _amount, _data);
        return(true);
    }

 ...
```

The function above can be run from the ERC20 using the interface IERC1155.

NFTs minted after burning can't be transfered from an account to another, it will be **permanent**.

##  Vesting

A multi-vesting system has been defined inside the ERC20 smart contract. The owner of the smart contract can create a list of vests for each address and each vest can be withdrew after a specific period of time.

```
    # ERC20_PDN.sol
    
    ...
    
    struct vest {
        uint amount;
        uint expirationDate;
    }
    
    mapping(address => vest[]) vestList;
    
    ...
```

Temporary the vest amount will be locked on the owner balance and only when the user address associated to the specific vest will withdraw that amount, the transfer will be done from the owner amount to the address. 

All ERC20 transfer actions for the owner will consider the lock amount due to the vesting system, in other words, owner can't transfer (with or without allowance) or can't create new vests if his balance is not greater than 0.

The use case follows this table:

| Owner Token Balance | Owner Lock Amount | Current Block | Vest Amount | Vest User Address | Vest Expiration Block | Withdraw |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
|100000|0|100|||||
|100000|5000|150|5000|A|500||
|100000|12000|200|7000|B|1000||
|100000|20000|400|8000|C|1200||
|95000|17000*|600|2000|B|2000|A (5000)|
|88000|11000*|1100|1000|D|2500|B (7000)|
|...|...|...|...|...|...|...|
|45000|40000**|15000|10000 (revert)||||

\* The final amount is: $ownerLock_{i-1}-Withdraw_{i}+VestAmount_{i}$

\** It's a mandatory that:

$owner_{balance}-owner_{lock}\geq Vest_{amount}$

$owner_{balance}-owner_{lock}\geq Transfer_{op}$

otherwise the function will be reverted.

Also transfer functionalities are overridden to avoid over spending from the owner.

## Function/Variables correlation for smart contract change status ERC20_PDN.sol

### * is a onlyOwner Function
|functionName\VariableName|ERC20.name|ERC20.symbol|ERC20.totalSupply|owner|owner.balance|genericAddresses.ERC20|balance|ERC1155Address|ID_ERC1155|ratio|genericAddress.ERC1155Balance|ownerLock|securityDelayInBlocks|vest.amount|vest.expirationBlockHeight|vest.address|vestList|
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
|initialize|Set Name|Set Symbol|Set Total Supply|Set Address|Add total supply to owner balance||||||||Set default value|||||
|runAirdrop*|||||( - ) Subtract sum of amounts|( + ) Add specific amount for each address||||Read||||||||
|burn|||( - ) amount burnt|||( - ) Subtract to the Address Balance a specific amount (if owner only on available amount)||||Read|||||||
|burnAndReceiveNFT|||( - ) amount burnt|||( - ) Subtract tokens for the integer part of the amount/ratio division (if owner only on available amount)|Read|Read|Read|Read|( + ) Add amounts/ratio NFTs|Read||||||
|setERC1155*||||||||Set|Set|Set||||||||
|setSecurityDelay*|||||||||||||Set|||||
|addVest*||||||||||||Add ( + ) vest amount value|Read|( + ) Set Vest Amount Value|Set|Set|( + ) Add Element on List for the specific address|
|withdrawVest|||||( - ) Subtract Vest Amount|( + ) Add Vest Amount||||||( - ) Subtract vest Amount value||Read|Read|Read|( - ) Delete Vest List for a specific index|
|getVestLength|||||||||||||||||Read|
|airdropVest*||||||||||||Add ( + ) list of vest amount value|Read|( + ) Set List of Vest Amount Value|Set|Set|( + ) Add Element on List for the a list of specific address|
|getVestLength||||||||||||||Read|Read|Read|Read|
|deleteUnexpiredVests*||||||||||||Add ( + ) List of amounts for expired deleted vests||Deleted|Deleted|Read|( - ) for all unexpired Vest of a specific address|

## Test Done

 - [x] Poseidon Token
     - Initialize
        - Initialize Upgradeable Token (659ms)
     - Token Basic Functionalities
        - Run Airdrop (102ms)
        - Run Airdrop - Array dimensions can't dismatch (67ms)
        - Run Airdrop - Non owner address can't run the function (59ms)
        - Run Airdrop - Can't put null values (58ms)
        - Run Airdrop - Can't run function if available balance is lower than sum of elements (67ms)
        - Set ERC1155 Connection (87ms)
        - Set ERC1155 Connection - Reverted if address is null (50ms)
        - Set ERC1155 Connection - Reverted if ratio is null (66ms)
        - Burn and Receive NFT - Generic Address (not owner) (105ms)
        - Burn and Receive NFT - Generic Address (not owner) can't mint if amount is greater than balance (97ms)
        - Burn and Receive NFT - Generic Address (not owner) can't mint if amount is lower than ratio (90ms)
        - Burn and Receive NFT - Owner can't burn if available balance is not enough (125ms)
        - Set Security Delay (53ms)
        - Set Security Delay - Can't set low value of security delay (48ms)
     - Vesting System
        - Add New Vest (62ms)
        - Add New Vest - Can't add new vest if block duration is lower tham security delay in blocks (49ms)
        - Add New Vest - Can't add new vest if available owner balance is lower than amount (55ms)
        - Withdraw Vest (2356ms)
        - Withdraw Vest - Can't withdraw a wrong vest index (2098ms)
        - Withdraw Vest - Can't withdraw if vest is not expired (62ms)
        - Airdrop Vest (154ms)
        - Airdrop Vest - Can't airdrop if data length dismatch _ 1 (52ms)
        - Airdrop Vest - Can't airdrop if data length dismatch _ 2 (76ms)
        - Airdrop Vest - Can't airdrop if duration block is lower than security delay (45ms)
        - Airdrop Vest - Can't airdrop if duration owner available balance is lower than sub of vest amounts (56ms)
        - Delete Unexpired Vests (2170ms)
        - Delete Unexpired Vests - Can't delete vests if they are expired (2020ms)
        - Owner can't transfer token if the available balance is lower than amount (54ms)
        - Owner can't transfer token if the available balance is lower than amount neither with allowance (61ms)

  - [x] Poseidon NFT
     - Initialize
        - Initialize Upgradeable NFT Smart Contract (74ms)
     - Mint and Transfer Functions
        - No one except ERC20 Address can Mint (64ms)
        - Safe Transfer From is reverted (61ms)
        - Safe Batch Transfer From is reverted (67ms)

We used hardhat to develop and test all smart contracts. To run all tests by yourself clone the repository and install all required dependencies. After that, please run:
```
npx hardhat test
```
