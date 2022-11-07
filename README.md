# Poseidon DAO Token ERC20-ERC1155

This project is part of the whole Poseidon DAO focused on thr hybrid token management system between the standard token ERC20 and ERC1155.

##  Hybrid Burning System

Poseidon Token is a standard ERC20 Token connected to an ERC1155 Token thanks to an **hybrid burning system** where we can burn an amount of token to receive a specific amount of NFT.

There is a ratio between both that specify the amount of ERC20 Token we need to be able to reach one single NFT and it can be set running the function:
```
 # ERC20_PDN.sol

 ...

    function setERC1155(address _ERC1155Address, uint _ID_ERC1155, uint _ratio) public onlyOwner returns(bool)

 ...
```
This function, runnable only from admin, set:

1. The ERC1155 Address linked to the ERC20 Address
2. The ID of the ERC1155
3. The ratio

Last parameter is defined as follow:

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

In the other smart contract, instead, we define in the initialization, the ERC20 address. In this way they are able to comunicate in a esclusive way cause the actor that is allowed to mint is only the ERC20 address previously declared.

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

The use case follow this table:

| Owner Token Balance | Owner Lock Amount | Current Block | Vest Amount | Vest User Address | Vest Expiration Block | Withdraw |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
|1000000|0|100|-|-|-|-|
|100000|5000|150|5000|A|500|-|
|100000|12000|200|7000|B|1000|-|
|100000|20000|400|8000|C|1200|-|
|95000|17000*|600|2000|B|2000|A (5000)|
|88000|11000*|1100|1000|D|2500|B (7000)|
|...|...|...|...|...|...|...|
|45000|40000**|15000|10000 (revert)|-|-|-|

\* The final amount is: $ownerLock_{i-1}-Withdraw_{i}+VestAmount_{i}$

\** It's a mandatory that:

$owner_{balance}-owner_{lock}\geq Vest_{amount}$

$owner_{balance}-owner_{lock}\geq Transfer_{op}$

otherwise the function will be reverted.

Also transfer functionalities are overriden to avoid over spending from the owner.