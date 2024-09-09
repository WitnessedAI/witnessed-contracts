import { MouseEvent, SetStateAction, useState } from "react";

import { useWeb3React } from "@web3-react/core";
import { Button, Input, InputNumber, message, Typography } from "antd";

import { useNativeBalance, useWriteContract } from "hooks";
import { parseBigNumberToFloat } from "utils/formatters";

const { Paragraph } = Typography;

const styles = {
  buttonTransfer: {
    display: "flex",
    margin: "15px 0"
  },
  display: {
    paddingBlock: "0 15px",
    display: "flex",
    flexDirection: "column"
  },
  statusText: {
    fontSize: "14px",
    marginBottom: "0",
    marginTop: "0"
  },
} as const;

const TransferErc20: React.FC = () => {
  const { account, provider } = useWeb3React();
  const [messageApi, contextHolder] = message.useMessage();
  const { loading, executeTx, signTransfer } = useWriteContract();
  const balance = useNativeBalance(provider, account);
  const [amount, setAmount] = useState<number | null>();

  const [erc20Address, setErc20Address] = useState<string>("0x82D50AD3C1091866E258Fd0f1a7cC9674609D254");
  const [safeAddress, setSafeAddress] = useState<string>("0xaBbb61a87CcDEb9A5EE3F703F279A746d4620C58");
  const [receiver, setReceiver] = useState<string>("");

  const [firstSignature, setFirstSignature] = useState<{
    tx: any;
    signature: any;
  } | undefined>(undefined);
  const [secondSignature, setSecondSignature] = useState<{
    tx: any;
    signature: any;
  } | undefined>(undefined);

  const handleErc20Change = (e: { target: { value: SetStateAction<string> } }) => {
    setErc20Address(e.target.value);
  };

  const handleSafeChange = (e: { target: { value: SetStateAction<string> } }) => {
    setSafeAddress(e.target.value);
  };

  const handleReceiverChange = (e: { target: { value: SetStateAction<string> } }) => {
    setReceiver(e.target.value);
  };

  const handleSign = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault();

    if (!erc20Address) {
      messageApi.error("The ERC20 Token Address is missing. Please check your input.");
      return;
    }

    if (!safeAddress) {
      messageApi.error("The Safe Address is missing. Please check your input.");
      return;
    }

    if (!receiver) {
      messageApi.error("The receiver address is missing. Please check your input.");
      return;
    }

    if (!amount) {
      messageApi.error("The amount is missing. Please double check your input.");
      return;
    }

    const signature = await signTransfer(erc20Address, safeAddress, receiver, amount);
    if (!signature.success) {
      messageApi.error(`An error occurred: ${signature.data}`);
      return;
    }
    // await signTransfer(erc20Address, safeAddress, receiver, amount);
    if (!firstSignature) {
      // assign signature in first
      setFirstSignature(signature.data);
      console.log("First signature: ", signature.data);
      messageApi.success("First signature added successfully.");
      return;
    }

    if (!secondSignature) {
      // assign signature in second
      setSecondSignature(signature.data);
      console.log("Second signature: ", signature.data);
      messageApi.success("Second signature added successfully.");
      return;
    }

  }

  const handleTransfer = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault();

    if (!receiver) {
      messageApi.error("The receiver address is missing. Please check your input.");
      return;
    }

    if (amount === 0) {
      messageApi.error("The amount can't be 0. Make sure your balance is positive, and double check your input.");
      return;
    }

    if (!amount) {
      messageApi.error("The amount is missing. Please double check your input.");
      return;
    }

    const resp = await executeTx(safeAddress, firstSignature?.tx, [firstSignature?.signature, secondSignature?.signature]);
    console.log("Response: ", resp);
    // if (success) {
    //   messageApi.success(
    //     `Success! Transaction Hash: ${getEllipsisTxt(data?.transactionHash ?? "Transactions Hash missing.", 8)}`
    //   );
    // } else {
    //   messageApi.error(`An error occurred: ${data}`);
    // }
  };

  return (
    <>
      {contextHolder}
      <div style={{ width: "100%", minWidth: "250px" }}>
        {/* <Title level={5}>Signatures required: {(+!!firstSignature) + (+!!secondSignature)} / 2</Title> */}
        <Typography style={styles.display}>
          <div style={{
            gap: "10px",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <Paragraph style={styles.statusText}> Signatures required: {(+!!firstSignature) + (+!!secondSignature)} / 2</Paragraph>
            <Button type="primary" shape="round" onClick={() => { setFirstSignature(undefined); setSecondSignature(undefined); }}>
              Reset
            </Button>
          </div>
        </Typography>
        <Input
          title="ERC20 Token Address"
          value={erc20Address}
          onChange={handleErc20Change}
          placeholder="ERC20 Token Address"
          style={{ marginBottom: "10px" }}
        />
        <Input
          title="Safe Address"
          value={safeAddress}
          onChange={handleSafeChange}
          placeholder="Safe Address"
          style={{ marginBottom: "10px" }}
        />
        <Input
          title="Receiver"
          value={receiver}
          onChange={handleReceiverChange}
          placeholder="Receiver address"
        />


        <div style={{ display: "inline-flex", gap: "10px", width: "100%" }}>
          <InputNumber
            value={amount}
            onChange={setAmount}
            placeholder="Amount to transfer"
            min={0}
            max={balance ? parseBigNumberToFloat(balance) : 0}
            style={{ width: "100%", height: "80%", marginBlock: "auto" }}
          />

          <div style={styles.buttonTransfer}>
            <Button type="primary" shape="round" onClick={handleSign} loading={loading} disabled={loading}>
              Sign
            </Button>
          </div>

          <div style={styles.buttonTransfer}>
            <Button type="primary" shape="round" onClick={handleTransfer} loading={loading} disabled={loading}>
              Transfer
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TransferErc20;
