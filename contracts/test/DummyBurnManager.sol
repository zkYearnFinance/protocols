/*

  Copyright 2017 Loopring Project Ltd (Loopring Foundation).

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
pragma solidity 0.5.1;
pragma experimental "ABIEncoderV2";

import "../iface/IFeeHolder.sol";

/// @author Brecht Devos - <brecht@loopring.org>
contract DummyBurnManager {

    address public feeHolderAddress = address(0x0);

    constructor(
        address _feeHolderAddress
        )
        public
    {
        feeHolderAddress = _feeHolderAddress;
    }

    function withdrawBurned(address token, uint value)
        external
        returns (bool success)
    {
        return IFeeHolder(feeHolderAddress).withdrawBurned(token, value);
    }
}
