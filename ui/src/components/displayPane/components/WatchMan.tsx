import { FC, MouseEvent, ReactElement, SetStateAction, useState } from "react";

import { Button, Divider, Input, message, Typography } from "antd";

import { useWriteContract } from "hooks";
const { Paragraph } = Typography;

const styles = {
    buttonSign: {
        margin: "15px auto"
    },
    display: {
        paddingBlock: "0 15px",
        display: "flex",
        flexDirection: "column"
    },
    statusText: {
        fontSize: "12px"
    },
    statusValue: {
        fontWeight: 800
    }
} as const;


const WatchMan: FC = (): ReactElement => {
    const [messageApi, contextHolder] = message.useMessage();
    const { loading, watchMan } = useWriteContract();
    // const [messageAuth, setMessageAuth] = useState<string>("");
    const [erc20Address, setErc20Address] = useState<string>("0x82D50AD3C1091866E258Fd0f1a7cC9674609D254");
    const [safeAddress, setSafeAddress] = useState<string>("0xaBbb61a87CcDEb9A5EE3F703F279A746d4620C58");
    const [treasuryAddress, setTreasuryAddress] = useState<string>("0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2");
    const [userAddress, setUserAddress] = useState<string>("");

    const [tokenName, setTokenName] = useState<string>("");
    const [safeBalance, setSafeBalance] = useState<string>("");
    const [treasuryBalance, setTreasuryBalance] = useState<string>("");
    const [userBalance, setUserBalance] = useState<string>("");

    const handleErc20Change = (e: { target: { value: SetStateAction<string> } }) => {
        setErc20Address(e.target.value);
    };

    const handleSafeChange = (e: { target: { value: SetStateAction<string> } }) => {
        setSafeAddress(e.target.value);
    };

    const handleTreasuryChange = (e: { target: { value: SetStateAction<string> } }) => {
        setTreasuryAddress(e.target.value);
    };

    const handleUserChange = (e: { target: { value: SetStateAction<string> } }) => {
        setUserAddress(e.target.value);
    }

    const handleWatchMan = async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
        event.preventDefault();

        const { success, data } = await watchMan(erc20Address, safeAddress, treasuryAddress, userAddress);

        if (success) {
            console.log(data);
            setTokenName(data.tokenName);
            setSafeBalance(data.safe);
            setTreasuryBalance(data.treasury);
            setUserBalance(data.user)
        } else {
            messageApi.error(`An error occurred: ${data}`);
        }
    };

    return (
        <>
            {contextHolder}
            <div style={{ width: "100%", minWidth: "250px" }}>

                <Input
                    allowClear
                    value={erc20Address}
                    onChange={handleErc20Change}
                    type="textarea"
                    placeholder="ERC20 Token Address"
                    style={{ marginBottom: "10px" }}
                />
                <Input
                    allowClear
                    value={safeAddress}
                    onChange={handleSafeChange}
                    type="textarea"
                    placeholder="Safe Address"
                    style={{ marginBottom: "10px" }}
                />
                <Input
                    allowClear
                    value={treasuryAddress}
                    onChange={handleTreasuryChange}
                    type="textarea"
                    placeholder="Treasury Address"
                    style={{ marginBottom: "10px" }}
                /> 
                <Input
                    allowClear
                    value={userAddress}
                    onChange={handleUserChange}
                    type="textarea"
                    placeholder="User Address"
                />

                <Divider />
                <Typography style={styles.display}>
                    <Paragraph style={styles.statusText}>Token Name: <span style={styles.statusValue}>{tokenName}</span></Paragraph>
                    <Paragraph style={styles.statusText}>Safe Balance: <span style={styles.statusValue}>{safeBalance}</span></Paragraph>
                    <Paragraph style={styles.statusText}>Treasury Balance: <span style={styles.statusValue}>{treasuryBalance}</span></Paragraph>
                    <Paragraph style={styles.statusText}>User Balance: <span style={styles.statusValue}>{userBalance}</span></Paragraph>
                </Typography>

                <Button type="primary" shape="round" style={styles.buttonSign} onClick={handleWatchMan} loading={loading}>
                    Watch
                </Button>
            </div>
        </>
    );
};

export default WatchMan;
