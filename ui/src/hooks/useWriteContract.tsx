import { useCallback, useState } from "react";

import { Contract, ethers } from "ethers";

import { useSignerOrProvider } from "./useSignerOrProvider";
import { ERC20_ABI, SAFE_ABI } from "consts/abis";
import { AddressZero } from "consts/addressZero";
import { useWeb3React } from "@web3-react/core";

export const useWriteContract = () => {
  const { signer } = useSignerOrProvider();
  const { account } = useWeb3React();
  const [loading, setLoading] = useState<boolean>(false);

  // Sign Message
  const signMessage = useCallback(
    async (messageAuth: string): Promise<{ success: boolean; data: string }> => {
      setLoading(true);
      const authMessage = messageAuth.length > 0 ? { Title: `${messageAuth}` } : { Title: "Hello Web3!" };

      try {
        const transactionHash = await signer?.signMessage(authMessage.Title);
        return { success: true, data: transactionHash ?? "" };
      } catch (error: any) {
        const message = error.reason ?? error.message ?? error;
        return { success: false, data: message };
      } finally {
        setLoading(false);
      }
    },
    [signer]
  );

  // Watchman
  const watchMan = useCallback(
    async (erc20: string, safe: string, treasury: string, user: string): Promise<{
      success: boolean; data: {
        tokenName: string;
        safe: string;
        treasury: string;
        user: string;
      }
    }> => {
      setLoading(true);
      try {

        if (!ethers.utils.isAddress(erc20)) {
          throw new Error("Invalid ERC20 address");
        }

        if (!ethers.utils.isAddress(safe)) {
          throw new Error("Invalid Safe address");
        }

        if (!ethers.utils.isAddress(treasury)) {
          throw new Error("Invalid Treasury address");
        }

        const tokenName = await new ethers.Contract(erc20, ["function name() view returns (string)"], signer).name();

        // get erc20 balances
        const erc20Contract = new ethers.Contract(erc20, ["function balanceOf(address) view returns (uint256)"], signer);
        const safeBalance = await erc20Contract.balanceOf(safe);
        const treasuryBalance = await erc20Contract.balanceOf(treasury);
        const userBalance = user === '' ? 0 : await erc20Contract.balanceOf(user);

        return {
          success: true, data: {
            tokenName,
            safe: ethers.utils.formatUnits(safeBalance, 18),
            treasury: ethers.utils.formatUnits(treasuryBalance, 18),
            user: ethers.utils.formatUnits(userBalance || 0, 18)
          }
        };
      }
      catch (error: any) {
        const message = error.reason ?? error.message ?? error;
        return { success: false, data: message };
      }
      finally {
        setLoading(false);
      }
    },
    [signer]
  );

  // Transfer Native Currency
  const transferNative = useCallback(
    async (
      receiver: string,
      amount: number
    ): Promise<{ success: boolean; data: ethers.providers.TransactionReceipt | undefined }> => {
      setLoading(true);
      try {
        if (!ethers.utils.isAddress(receiver)) {
          throw new Error("Invalid address");
        }
        if (!amount || amount <= 0) {
          throw new Error("Invalid amount");
        }

        const amountToString = amount.toString();
        const tx = {
          to: receiver,
          value: ethers.utils.parseEther(amountToString)
        };

        const transaction = await signer?.sendTransaction(tx);
        const receipt = await transaction?.wait(2);
        return { success: true, data: receipt };
      } catch (error: any) {
        const message = error.reason ?? error.message ?? error;
        return { success: false, data: message };
      } finally {
        setLoading(false);
      }
    },
    [signer, account]
  );

  const signTransfer = useCallback(
    async (
      erc20: string,
      safe: string,
      receiver: string,
      amount: number
    ): Promise<{
      success: boolean; data: {
        tx: any;
        signature: any;
      }
    }> => {
      setLoading(true);
      try {
        if (!ethers.utils.isAddress(erc20)) {
          throw new Error("Invalid ERC20 address");
        }

        if (!ethers.utils.isAddress(safe)) {
          throw new Error("Invalid Safe address");
        }

        if (!ethers.utils.isAddress(receiver)) {
          throw new Error("Invalid receiver address");
        }

        if (!amount || amount <= 0) {
          throw new Error("Invalid amount");
        }

        const amountInEth = ethers.utils.parseUnits(amount.toFixed(0), 18); // Amount to transfer in eth
        console.log("amountInEth", amountInEth);

        // Build the ERC-20 transfer transaction (this will encode the transfer function)
        const methodName = "transfer";
        const methodParams = [receiver.toLowerCase(), amountInEth];

        const safeContract = new ethers.Contract(safe, SAFE_ABI, signer);
        const erc20Contract = new ethers.Contract(erc20, ERC20_ABI, signer);

        const data = await executeContractCallWithSigners(safeContract, erc20Contract, methodName, methodParams);
        return { success: true, data };
      } catch (error: any) {
        const message = error.reason ?? error.message ?? error;
        return { success: false, data: message };
      } finally {
        setLoading(false);
      }
    },
    [signer, account]
  );

  const signTransferFrom = useCallback(
    async (
      erc20: string,
      safe: string,
      sender: string,
      receiver: string,
      amount: number
    ): Promise<{
      success: boolean; data: {
        tx: any;
        signature: any;
      }
    }> => {
      setLoading(true);
      try {
        if (!ethers.utils.isAddress(erc20)) {
          throw new Error("Invalid ERC20 address");
        }

        if (!ethers.utils.isAddress(safe)) {
          throw new Error("Invalid Safe address");
        }

        if (!ethers.utils.isAddress(receiver)) {
          throw new Error("Invalid receiver address");
        }

        if (!amount || amount <= 0) {
          throw new Error("Invalid amount");
        }

        const amountInEth = ethers.utils.parseUnits(amount.toFixed(0), 18); // Amount to transfer in eth
        console.log("amountInEth", amountInEth);

        // Build the ERC-20 transfer transaction (this will encode the transfer function)
        const methodName = "transferFrom";
        const methodParams = [sender.toLowerCase(), receiver.toLowerCase(), amountInEth];

        const safeContract = new ethers.Contract(safe, SAFE_ABI, signer);
        const erc20Contract = new ethers.Contract(erc20, ERC20_ABI, signer);

        const data = await executeContractCallWithSigners(safeContract, erc20Contract, methodName, methodParams);
        return { success: true, data };
      } catch (error: any) {
        const message = error.reason ?? error.message ?? error;
        return { success: false, data: message };
      } finally {
        setLoading(false);
      }
    },
    [signer, account]
  );

  const signDataCall = useCallback(
    async (
      safe: string,
      to: string,
      _data: string,
      delegateCall?: boolean
    ): Promise<{
      success: boolean; data: {
        tx: any;
        signature: any;
      }
    }> => {
      setLoading(true);
      try {
        if (!ethers.utils.isAddress(safe)) {
          throw new Error("Invalid Safe address");
        }

        if (!ethers.utils.isAddress(to)) {
          throw new Error("Invalid to address");
        }

        const safeContract = new ethers.Contract(safe, SAFE_ABI, signer);

        const data = await executeDataCallWithSigners(safeContract, to, _data, delegateCall);
        return { success: true, data };
      } catch (error: any) {
        const message = error.reason ?? error.message ?? error;
        return { success: false, data: message };
      } finally {
        setLoading(false);
      }
    },
    [signer, account]
  );

  const approveTransfer = useCallback(
    async (
      erc20: string,
      spender: string
    ): Promise<{
      tx: any;
      receipt: any;
    }> => {
      setLoading(true);
      // use current signer to call tx to approve spender
      const erc20Contract = new ethers.Contract(erc20, ERC20_ABI, signer);
      const tx = await erc20Contract.approve(spender, ethers.constants.MaxUint256);
      const receipt = await tx.wait();
      setLoading(false);
      return { tx, receipt };
    },
    [signer, account]
  );

  const executeDataCallWithSigners = useCallback(async (
    safe: Contract,
    to: string,
    data: string,
    delegateCall?: boolean,
  ) => {
    const tx = buildDataCall(to, data, (await safe.nonce()), delegateCall);
    console.log("tx", tx);

    // retrieve chain id
    const cid = await safe.provider?.getNetwork();
    const signerAddress = await signer?.getAddress();
    console.log("signerAddress", signerAddress);
    console.log("account", account);


    console.log({ verifyingContract: safe.address, chainId: +cid.chainId }, EIP712_SAFE_TX_TYPE, tx);
    const signature = await (signer as any)?._signTypedData({ verifyingContract: safe.address, chainId: cid.chainId.toFixed(0) }, EIP712_SAFE_TX_TYPE, tx)
    console.log("signature", signature);
    return {
      tx,
      signature: {
        signer: signerAddress,
        data: signature,
      },
    };
    // return executeTxWithSigners(safe, tx, signers);
  }, [signer, account]);

  const executeContractCallWithSigners = useCallback(async (
    safe: Contract,
    contract: Contract,
    method: string,
    params: any[],
    delegateCall?: boolean,
  ) => {
    const tx = buildContractCall(contract, method, params, (await safe.nonce()), delegateCall);
    console.log("tx", tx);

    // retrieve chain id
    const cid = await safe.provider?.getNetwork();
    const signerAddress = await signer?.getAddress();
    console.log("signerAddress", signerAddress);
    console.log("account", account);


    console.log({ verifyingContract: safe.address, chainId: +cid.chainId }, EIP712_SAFE_TX_TYPE, tx);
    const signature = await (signer as any)?._signTypedData({ verifyingContract: safe.address, chainId: cid.chainId.toFixed(0) }, EIP712_SAFE_TX_TYPE, tx)
    console.log("signature", signature);
    return {
      tx,
      signature: {
        signer: signerAddress,
        data: signature,
      },
    };
    // return executeTxWithSigners(safe, tx, signers);
  }, [signer, account]);

  const EIP712_SAFE_TX_TYPE = {
    // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  };

  interface SafeSignature {
    signer: string;
    data: string;
    // a flag to indicate if the signature is a contract signature and the data has to be appended to the dynamic part of signature bytes
    dynamic?: true;
  }

  const buildSignatureBytes = (signatures: SafeSignature[]): string => {
    const SIGNATURE_LENGTH_BYTES = 65;
    signatures.sort((left, right) => left.signer.toLowerCase().localeCompare(right.signer.toLowerCase()));

    let signatureBytes = "0x";
    let dynamicBytes = "";
    for (const sig of signatures) {
      if (sig.dynamic) {
        /* 
            A contract signature has a static part of 65 bytes and the dynamic part that needs to be appended at the end of 
            end signature bytes.
            The signature format is
            Signature type == 0
            Constant part: 65 bytes
            {32-bytes signature verifier}{32-bytes dynamic data position}{1-byte signature type}
            Dynamic part (solidity bytes): 32 bytes + signature data length
            {32-bytes signature length}{bytes signature data}
        */
        const dynamicPartPosition = (signatures.length * SIGNATURE_LENGTH_BYTES + dynamicBytes.length / 2)
          .toString(16)
          .padStart(64, "0");
        const dynamicPartLength = (sig.data.slice(2).length / 2).toString(16).padStart(64, "0");
        const staticSignature = `${sig.signer.slice(2).padStart(64, "0")}${dynamicPartPosition}00`;
        const dynamicPartWithLength = `${dynamicPartLength}${sig.data.slice(2)}`;

        signatureBytes += staticSignature;
        dynamicBytes += dynamicPartWithLength;
      } else {
        signatureBytes += sig.data.slice(2);
      }
    }

    return signatureBytes + dynamicBytes;
  };

  const executeTx = useCallback(async (safeAddress: string, safeTx: any, signatures: SafeSignature[]): Promise<any> => {
    const signatureBytes = buildSignatureBytes(signatures);
    const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
    console.log(`
      SafeTx: ${safeTx.to}
      Value: ${safeTx.value}
      Data: ${safeTx.data}
      Operation: ${safeTx.operation}
      SafeTxGas: ${safeTx.safeTxGas}
      BaseGas: ${safeTx.baseGas}
      GasPrice: ${safeTx.gasPrice}
      GasToken: ${safeTx.gasToken}
      RefundReceiver: ${safeTx.refundReceiver}
      Nonce: ${safeTx.nonce}
      Signatures: ${signatureBytes}
      `
    );
    return safe.execTransaction(
      safeTx.to,
      safeTx.value,
      safeTx.data,
      safeTx.operation,
      safeTx.safeTxGas,
      safeTx.baseGas,
      safeTx.gasPrice,
      safeTx.gasToken,
      safeTx.refundReceiver,
      signatureBytes,
      {}
    );
  }, [account, signer]);


  const buildDataCall = (to: string, data: string, nonce: number, delegateCall?: boolean): any => {
    const toSign = buildSafeTransaction({
      to,
      data,
      nonce,
      operation: delegateCall ? 1 : 0,
    });
    console.log("toSign", toSign);

    // sign typed data by signer
    return toSign;
  }

  const buildContractCall = (
    contract: Contract,
    method: string,
    params: any[],
    nonce: number,
    delegateCall?: boolean,
  ): any => {
    const data = contract.interface.encodeFunctionData(method, params);
    console.log("data", data);
    console.log("nonce", nonce);
    console.log("delegateCall", delegateCall);
    const toSign = buildSafeTransaction({
      to: contract.address,
      data,
      operation: delegateCall ? 1 : 0,
      nonce,
    });
    console.log("toSign", toSign);

    // sign typed data by signer
    return toSign;
  };


  const buildSafeTransaction = (template: {
    to: string;
    value?: number | string;
    data?: string;
    operation?: number;
    safeTxGas?: number | string;
    baseGas?: number | string;
    gasPrice?: number | string;
    gasToken?: string;
    refundReceiver?: string;
    nonce: number;
  }): any => {
    const toSign = {
      to: template.to,
      value: template.value || 0,
      data: template.data || "0x",
      operation: template.operation || 0,
      safeTxGas: template.safeTxGas || 0,
      baseGas: template.baseGas || 0,
      gasPrice: template.gasPrice || 0,
      gasToken: template.gasToken || AddressZero,
      refundReceiver: template.refundReceiver || AddressZero,
      nonce: template.nonce,
    };
    return toSign;
  };

  return {
    loading,
    signMessage,
    watchMan,
    transferNative,
    signTransfer,
    signTransferFrom,
    signDataCall,
    buildDataCall,
    executeTx,
    approveTransfer
  };
};
