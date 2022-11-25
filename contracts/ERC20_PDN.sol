// SPDX-License-Identifier: UNLICENSED

/*
  _____               _     _               _____          ____  
 |  __ \             (_)   | |             |  __ \   /\   / __ \ 
 | |__) ___  ___  ___ _  __| | ___  _ __   | |  | | /  \ | |  | |
 |  ___/ _ \/ __|/ _ | |/ _` |/ _ \| '_ \  | |  | |/ /\ \| |  | |
 | |  | (_) \__ |  __| | (_| | (_) | | | | | |__| / ____ | |__| |
 |_|   \___/|___/\___|_|\__,_|\___/|_| |_| |_____/_/    \_\____/ 
                                                                 
*/
pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol';
import './IERC1155_PDN.sol';
 
contract ERC20_PDN is ERC20Upgradeable { 

    using SafeMathUpgradeable for uint;
    
    address public owner;

    address public ERC1155Address;
    uint public ID_ERC1155;
    uint public ratio;
    uint public ownerLock;
    uint public constant SECURITY_DELAY = uint(5760);

    struct vest {
        uint amount;
        uint expirationDate;
    }

    mapping(address => vest[]) vestList;

    event ERC1155SetEvent(address indexed owner, address ERC1155address, uint ERC1155ID, uint ratio);
    event DAOConnectionEvent(address indexed owner, address AccessibilitySettingsAddress);
    event OwnerChangeEvent(address indexed oldOwner, address indexed newOwner);
    event AddVestEvent(address to, uint amount, uint duration);
    event DeleteVestEvent(address owner, address to);
    event WithdrawVestEvent(uint vestIndex, address receiver, uint amount);

    /*
    * @dev: This modifier allows function to be run only from the owner of the smart contract itself.
    *       The owner can be changed thanks to 'changeOwner' event and after 1 week with 'confirmChangeOwner'
    *
    * Requirements:
    *       - The owner has to be the address that make the signature of the transaction itself
    */

    modifier onlyOwner {
        require(owner == msg.sender, "ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
        _;
    }

    /*
    * @dev: We initialize the upgradeable smart contract with all ERC20 metadata: { name }, { symbol },
    *       { totalSupply }, { decimals }. Automatically who initialize the smart contract is the owner
    *       of the smartcontract itself. { decimals } usually is set to 18
    *
    * Requirements:
    *       - No requirements needed
    *
    * Events:
    *       - OwnerChangeEvent: the ownership change is created
    */

    function initialize(string memory _name, string memory _symbol, uint _totalSupply, uint _decimals) initializer public {
        __ERC20_init(_name, _symbol);
        _mint(msg.sender, _totalSupply * (uint(10) ** _decimals));   
        owner = msg.sender;
        emit OwnerChangeEvent(address(0), msg.sender);
    }

    /*
    * @dev: This function allows to transfer token from the unlocked owner balance to a serie of specific
    *       addesses
    *
    * Requirements:
    *       - Only the owner of the smart contract can run this function
    *       - { addresses } and { amounts } has to have the same length
    *       - every single address and every single amount inside both list can't have NULL values
    *       - Unlocked owner balance has to be greater than the sum of amounts inside the { amounts } list
    *
    * Events:
    *       - _transfer: standard ERC20 transfer event for each address and amount specified above
    */

    function runAirdrop(address[] memory _addresses, uint[] memory _amounts, uint _decimals) public onlyOwner returns(bool){
        require(_addresses.length == _amounts.length, "DATA_DIMENSION_DISMATCH");
        uint availableOwnerBalance = balanceOf(msg.sender).sub(ownerLock);
        for(uint index = uint(0); index < _addresses.length; index++){
            require(_addresses[index] != address(0) && _amounts[index] != uint(0), "CANT_SET_NULL_VALUES");
            require(availableOwnerBalance >= _amounts[index], "INSUFFICIENT_OWNER_BALANCE");
            availableOwnerBalance = availableOwnerBalance.sub(_amounts[index]);
            _transfer(msg.sender, _addresses[index], _amounts[index].mul(uint(10) ** _decimals));
        }
        return true;
    }

    /*
    * @dev: Standard ERC20 burn function
    *
    * Events:
    *       - OwnerChangeEvent: Standard ERC20 burn event
    */

    function burn(uint _amount) public returns(bool){
        _burn(msg.sender, _amount);
        return true;
    }
 
    /*
    * @dev: This function allows to burn token and receive NFT in a ratio K token : 1 NFT in an integer
    *       way. It means (K + Q) token : 1 NFT if Q < K.
    *
    * Requirements:
    *       - The ERC1155 smart contract address hat to be set
    *       - The amount of token has to be greater than ratio: amount >= K
    *
    * Events:
    *       - ERC20 burn
    *       - ERC1155 mint
    */

    function burnAndReceiveNFT(uint _amount) public returns(bool){
        address tmpERC1155Address = ERC1155Address;
        require(tmpERC1155Address != address(0), "ERC1155_ADDRESS_NOT_SET");
        uint tmpRatio = ratio;
        uint NFTAmount = _amount.div(tmpRatio);
        require(balanceOf(msg.sender).div(tmpRatio) >= NFTAmount && NFTAmount > uint(0), "NOT_ENOUGH_TOKEN_TO_RECEIVE_NFT");
        _burn(msg.sender, NFTAmount.mul(ratio).mul(uint(10) ** decimals()));
        IERC1155_PDN IERC1155_PDN_Interface = IERC1155_PDN(ERC1155Address);
        IERC1155_PDN_Interface.mint(msg.sender, ID_ERC1155, NFTAmount, bytes("0"));
        return true;
    }

    /*
    * @dev: This function allows to set the ERC1155 Address, the ERC1155 item ID and the ratio
    *
    * Requirements:
    *       - { ERC1155Address }, { ERC1155ID }, { RATIO } can't be set to 0 values
    *
    * Events:
    *       - ERC1155SetEvent
    */

    function setERC1155(address _ERC1155Address, uint _ID_ERC1155, uint _ratio) public onlyOwner returns(bool){
        require(_ERC1155Address != address(0), "ADDRESS_CANT_BE_NULL");
        require(_ID_ERC1155 > uint(0), "ID_CANT_BE_ZERO");
        require(_ratio > uint(0), "RATIO_CANT_BE_ZERO");
        ERC1155Address = _ERC1155Address;
        ID_ERC1155 = _ID_ERC1155;
        ratio = _ratio;
        emit ERC1155SetEvent(msg.sender, _ERC1155Address, _ID_ERC1155, _ratio);
        return true;
    }

    /*
    * @dev: This function allows to add a vest for a specific { address }, { amount } and { duration }
    *
    * Requirements:
    *       - It's not possibile to add a new vest if the vest is already active
    *       - The minimum duration is equale to 5760 blocks (1 day avg)
    *       - The owner balance has to cover the vest amount
    *
    * Events:
    *       - AddVestEvent
    */

    function addVest(address _address, uint _amount, uint _duration) public onlyOwner returns(bool){
        uint tmpOwnerLock = ownerLock;
        require(_duration >= SECURITY_DELAY, "INSUFFICIENT_DURATION");
        require(balanceOf(msg.sender).sub(tmpOwnerLock) >= _amount, "INSUFFICIENT_OWNER_BALANCE");
        vestList[_address].push(vest({
            amount: _amount,
            expirationDate: uint(block.number).add(_duration)
        }));
        ownerLock = tmpOwnerLock.add(_amount);
        emit AddVestEvent(_address, _amount, _duration);
        return true;
    }

    /*
    * @dev: This function allows to withdraw a Vest based on the index Vest
    *
    * Requirements:
    *       - The vest has to be set (with amount greater than 0)
    *       - The vest has to be expired
    *
    * Events:
    *       - WithdrawVestEvent
    *       - ERC20 transfer event
    */

    function withdrawVest(uint _index) public returns(bool){
        uint length = vestList[msg.sender].length;
        require(length > _index, "VEST_INDEX_DISMATCH");
        uint vestAmount = vestList[msg.sender][_index].amount;
        vestList[msg.sender][_index].amount = uint(0);
        require(vestAmount > uint(0), "VEST_ALREADY_WITHDREW");
        require(vestList[msg.sender][_index].expirationDate < block.number, "VEST_NOT_EXPIRED");
        ownerLock = ownerLock.sub(vestAmount);
        if(length > 1) vestList[msg.sender][_index] = vestList[msg.sender][length.sub(1)];
        vestList[msg.sender].pop();
        _transfer(owner, msg.sender, vestAmount);
        emit WithdrawVestEvent(_index, msg.sender, vestAmount);
        return true;
    }

    /*
    * @dev: This function allows to get the list of available vestIndex
    */

    function getVestLength(address _address) public view returns(uint){
        return vestList[_address].length;
    }

    /*
    * @dev: This function allows to create an airdrop of vests based on a list of { addresses }, { amounts } and { durations }
    *
    * Requirements:
    *       - Arrays have to have the same length
    *
    * Events:
    *       - AddVestEvent for each address
    */

    function airdropVest(address[] memory _addresses, uint[] memory _amounts, uint[] memory _durations) public onlyOwner returns(bool){
        require(_addresses.length == _amounts.length, "DATA_DIMENSION_DISMATCH");
        require(_addresses.length == _durations.length, "DATA_DIMENSION_DISMATCH");
        uint tmpOwnerLock = ownerLock;
        for(uint index = uint(0); index < _durations.length; index++){
            require(_durations[index] >= uint(5760), "INSUFFICIENT_DURATION");
            require(balanceOf(msg.sender).sub(tmpOwnerLock) >= _amounts[index], "INSUFFICIENT_OWNER_BALANCE");
            vestList[_addresses[index]].push(vest({
                amount: _amounts[index],
                expirationDate: uint(block.number).add(_durations[index])
            }));
            tmpOwnerLock = tmpOwnerLock.add(_amounts[index]);
            emit AddVestEvent(_addresses[index], _amounts[index], _durations[index]);
        }
        ownerLock = tmpOwnerLock;
        return true;
    }

    /*
    * @dev: Return all vest metadata: { amount }, { expirationBlock }
    */

    function getVestMetaData(uint _index, address _address) public view returns(uint, uint){
        return (vestList[_address][_index].amount, vestList[_address][_index].expirationDate);
    }

    /*
    * @dev: This function delete a vest
    *
    * Requirements:
    *       - Only the multisig smart contract is able to run this function
    *
    * Events:
    *       - DeleteVestEvent 
    */

    function deleteVest(address _address) public onlyOwner returns(bool){
        delete vestList[_address];
        emit DeleteVestEvent(msg.sender, _address);
        return true;
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        if(msg.sender == owner) {
            require(balanceOf(msg.sender).sub(ownerLock) >= amount, "NOT_ENOUGH_TOKEN");
        }
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        if(from == owner) {
            require(balanceOf(from).sub(ownerLock) >= amount, "NOT_ENOUGH_TOKEN");
        }
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }
}

