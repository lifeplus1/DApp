// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockLPToken is ERC20, Ownable {
    mapping(address => bool) public minters;
    constructor() ERC20("MockCurveLP", "m3CRV") Ownable(msg.sender) {}
    function setMinter(address m, bool a) external onlyOwner {
        minters[m] = a;
    }
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "NOT_MINTER");
        _;
    }
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
    function burn(address from, uint256 amount) external onlyMinter {
        _burn(from, amount);
    }
}

contract MockCRV is ERC20, Ownable {
    mapping(address => bool) public minters;
    constructor() ERC20("MockCRV", "mCRV") Ownable(msg.sender) {}
    function setMinter(address m, bool a) external onlyOwner {
        minters[m] = a;
    }
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "NOT_MINTER");
        _;
    }
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}

contract MockCurvePool is Ownable {
    uint256 public virtualPrice = 1e18; // 1:1
    uint256 public poolFee = 3000000; // 0.3%
    address[3] public coinsArr;
    MockLPToken public lpToken;

    constructor(
        address _dai,
        address _usdc,
        address _usdt,
        address _lp
    ) Ownable(msg.sender) {
        coinsArr = [_dai, _usdc, _usdt];
        lpToken = MockLPToken(_lp);
    }

    function add_liquidity(
        uint256[3] calldata amounts,
        uint256 /*min_mint_amount*/
    ) external returns (uint256) {
        uint256 amt = amounts[1]; // use USDC index only for simplicity
        lpToken.mint(msg.sender, amt);
        return amt;
    }
    function remove_liquidity_one_coin(
        uint256 token_amount,
        int128 /*i*/,
        uint256 /*min_amount*/
    ) external returns (uint256) {
        lpToken.burn(msg.sender, token_amount);
        return token_amount; // 1:1
    }
    function get_virtual_price() external view returns (uint256) {
        return virtualPrice;
    }
    function balances(uint256) external pure returns (uint256) {
        return 0;
    }
    function coins(uint256 i) external view returns (address) {
        return coinsArr[i];
    }
    function fee() external view returns (uint256) {
        return poolFee;
    }
}

contract MockCurveGauge is Ownable {
    MockLPToken public lp;
    MockCRV public crv;
    mapping(address => uint256) public staked;
    mapping(address => uint256) public pending;

    constructor(address _lp, address _crv) Ownable(msg.sender) {
        lp = MockLPToken(_lp);
        crv = MockCRV(_crv);
    }
    function deposit(uint256 amount) external {
        lp.transferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        // accrue simple fixed reward (1% of deposit)
        uint256 reward = amount / 100;
        crv.mint(address(this), reward);
        pending[msg.sender] += reward;
    }
    function withdraw(uint256 amount) external {
        require(staked[msg.sender] >= amount, "INSUFFICIENT");
        staked[msg.sender] -= amount;
        lp.mint(msg.sender, amount); // return LP tokens
    }
    function balanceOf(address user) external view returns (uint256) {
        return staked[user];
    }
    function claimable_tokens(address user) external view returns (uint256) {
        return pending[user];
    }
    function claim_rewards() external {
        uint256 r = pending[msg.sender];
        if (r > 0) {
            pending[msg.sender] = 0;
            crv.transfer(msg.sender, r);
        }
    }
}
