import BN = require("bn.js");
import { expectThrow } from "./expectThrow";
import { ExchangeTestUtil } from "./testExchangeUtil";

contract("Loopring", (accounts: string[]) => {

  let exchangeTestUtil: ExchangeTestUtil;
  let loopring: any;

  before( async () => {
    exchangeTestUtil = new ExchangeTestUtil();
    await exchangeTestUtil.initialize(accounts);
    loopring = exchangeTestUtil.loopringV3;
  });

  const withdrawTheBurnChecked = async (token: string, recipient: string, expectedAmount: BN) => {
    const tokenAddress = exchangeTestUtil.getTokenAddress(token);

    const balanceRecipientBefore = await exchangeTestUtil.getOnchainBalance(recipient, tokenAddress);
    const balanceContractBefore = await exchangeTestUtil.getOnchainBalance(loopring.address, tokenAddress);

    await loopring.withdrawTheBurn(tokenAddress, recipient,
                                   {from: exchangeTestUtil.testContext.deployer, gasPrice: 0});

    const balanceRecipientAfter = await exchangeTestUtil.getOnchainBalance(recipient, tokenAddress);
    const balanceContractAfter = await exchangeTestUtil.getOnchainBalance(loopring.address, tokenAddress);

    assert(balanceRecipientAfter.eq(balanceRecipientBefore.add(expectedAmount)),
           "Token balance of recipient should be increased by amount");
    assert(balanceContractAfter.eq(balanceContractBefore.sub(expectedAmount)),
           "Token balance of contract should be decreased by amount");
  };

  describe("Staking", function() {
    this.timeout(0);

    describe("Owner", () => {
      it("should be able to withdraw the protocol fee stake", async () => {
        // Deposit some LRC to stake for the exchange
        const depositer = exchangeTestUtil.testContext.operators[2];
        const stakeAmount = new BN(web3.utils.toWei("1234567", "ether"));
        await exchangeTestUtil.setBalanceAndApprove(depositer, "LRC", stakeAmount, loopring.address);

        // Stake it
        await exchangeTestUtil.depositProtocolFeeStakeChecked(stakeAmount, depositer);

        // Try to withdraw it from an unauthorized address on the exchange contract
        await expectThrow(
          exchangeTestUtil.exchange.withdrawProtocolFeeStake(
            exchangeTestUtil.exchangeOwner, stakeAmount, {from: exchangeTestUtil.exchangeOperator},
          ),
          "UNAUTHORIZED",
        );

        // Try to withdraw it from an unauthorized address on the loopring contract
        await expectThrow(
          loopring.withdrawProtocolFeeStake(
            exchangeTestUtil.exchangeId, exchangeTestUtil.exchangeOwner, stakeAmount,
            {from: exchangeTestUtil.exchangeOwner},
          ),
          "UNAUTHORIZED",
        );

        // Withdraw the exchange stake
        await exchangeTestUtil.withdrawProtocolFeeStakeChecked(
          exchangeTestUtil.exchangeOwner, stakeAmount,
        );
      });
    });
  });

  describe("Owner", () => {
    it("should be able to withdraw 'The Burn'", async () => {
      const user = exchangeTestUtil.testContext.orderOwners[0];
      const amountA = new BN(web3.utils.toWei("1.23", "ether"));
      const amountB = new BN(web3.utils.toWei("456", "ether"));
      await exchangeTestUtil.setBalanceAndApprove(user, "WETH", amountB, loopring.address);
      // Transfer some funds to the contract that we can withdraw
      // ETH
      await web3.eth.sendTransaction({from: user, to: loopring.address, value: amountA});
      // WETH
      const WETH = await exchangeTestUtil.getTokenContract("WETH");
      await WETH.transfer(loopring.address, amountB, {from: user});

      // Withdraw
      const recipient = exchangeTestUtil.testContext.orderOwners[1];
      // ETH
      await withdrawTheBurnChecked("ETH", recipient, amountA);
      // WETH
      await withdrawTheBurnChecked("WETH", recipient, amountB);
    });

    it("should not be able to withdraw any LRC", async () => {
      const user = exchangeTestUtil.testContext.orderOwners[0];
      const amount = new BN(web3.utils.toWei("123.456", "ether"));
      await exchangeTestUtil.setBalanceAndApprove(user, "LRC", amount, loopring.address);
      // Transfer some funds to the contract that we can withdraw
      const LRC = await exchangeTestUtil.getTokenContract("LRC");
      await LRC.transfer(loopring.address, amount, {from: user});

      // Withdraw
      const recipient = exchangeTestUtil.testContext.orderOwners[1];
      // LRC
      await expectThrow(
        loopring.withdrawTheBurn(exchangeTestUtil.getTokenAddress("LRC"), recipient,
        {from: exchangeTestUtil.testContext.deployer}),
        "LRC_ALREADY_BURNED",
      );
    });

    it("should not be able to withdraw any LRC", async () => {
      const user = exchangeTestUtil.testContext.orderOwners[0];
      const amount = new BN(web3.utils.toWei("123.456", "ether"));
      await exchangeTestUtil.setBalanceAndApprove(user, "LRC", amount, loopring.address);
      // Transfer some funds to the contract that we can withdraw
      const LRC = await exchangeTestUtil.getTokenContract("LRC");
      await LRC.transfer(loopring.address, amount, {from: user});

      // Withdraw
      const recipient = exchangeTestUtil.testContext.orderOwners[1];
      // LRC
      await expectThrow(
        loopring.withdrawTheBurn(exchangeTestUtil.getTokenAddress("LRC"), recipient,
        {from: exchangeTestUtil.testContext.deployer}),
        "LRC_ALREADY_BURNED",
      );
    });
  });

  describe("anyone", () => {
    it("should not be able to withdraw 'The Burn'", async () => {
      const user = exchangeTestUtil.testContext.orderOwners[0];
      const amountA = new BN(web3.utils.toWei("1.23", "ether"));
      const amountB = new BN(web3.utils.toWei("456", "ether"));
      await exchangeTestUtil.setBalanceAndApprove(user, "WETH", amountB, loopring.address);
      // Transfer some funds to the contract that we can withdraw
      // ETH
      await web3.eth.sendTransaction({from: user, to: loopring.address, value: amountA});
      // WETH
      const WETH = await exchangeTestUtil.getTokenContract("WETH");
      await WETH.transfer(loopring.address, amountB, {from: user});

      // Try to withdraw
      const recipient = exchangeTestUtil.testContext.orderOwners[1];
      // ETH
      await expectThrow(
        loopring.withdrawTheBurn(exchangeTestUtil.getTokenAddress("ETH"), recipient, {from: recipient}),
        "UNAUTHORIZED",
      );
      // WETH
      await expectThrow(
        loopring.withdrawTheBurn(exchangeTestUtil.getTokenAddress("WETH"), recipient, {from: recipient}),
        "UNAUTHORIZED",
      );
    });

    it("should not be able to burn the stake", async () => {
      await expectThrow(
        loopring.burnExchangeStake(exchangeTestUtil.exchangeId, new BN(0),
        {from: exchangeTestUtil.testContext.deployer}),
        "UNAUTHORIZED",
      );
    });

    it("should not be able to withdraw the stake", async () => {
      const recipient = exchangeTestUtil.testContext.orderOwners[1];
      await expectThrow(
        loopring.withdrawExchangeStake(exchangeTestUtil.exchangeId, recipient, new BN(0),
        {from: exchangeTestUtil.testContext.deployer}),
        "UNAUTHORIZED",
      );
    });
  });
});
