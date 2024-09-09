import { useWeb3React } from "@web3-react/core";
import {
  Divider,
  Typography
} from "antd";
const { Title } = Typography;

import { useWindowSize } from "hooks";

import {
  Infos,
  Status,
  TransferErc20,
  WatchMan
} from "./components";

const styles = {
  container: {
    width: "80%",
    minWidth: "330px",
    maxWidth: "900px",
    textAlign: "center",
    margin: "auto",
    padding: "20px 0",
    borderRadius: "10px",
    boxShadow: "0px 0px 30px 30px rgba(30, 136, 229, 0.2)"
  },
  content: {
    width: "85%",
    margin: "auto",
    fontSize: "17px"
  },
  action: {
    display: "inline-flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "20px"
  }
} as const;

type DisplayPaneProps = {
  isDarkMode: boolean;
};

const DisplayPane: React.FC<DisplayPaneProps> = ({ isDarkMode }) => {
  const { chainId, isActivating, isActive } = useWeb3React();
  const { isTablet } = useWindowSize();

  return (
    <>

      <div
        style={{
          ...styles.container,
          border: isDarkMode ? "1px solid rgba(152, 161, 192, 0.24)" : "none",
          width: isTablet ? "90%" : "30%"
        }}
      >
        <div style={styles.content}>
          <Title level={2}>Wallet Info</Title>
          <Status isActivating={isActivating} isActive={isActive} />
          <Infos chainId={chainId} />
        </div>
      </div>

      <div
        style={{
          ...styles.container,
          border: isDarkMode ? "1px solid rgba(152, 161, 192, 0.24)" : "none",
          width: isTablet ? "90%" : "30%"
        }}
      >
        <div style={styles.content}>
          <Title level={2}>Watchman</Title>
          {isActive && (
            <>
              <Divider />
              <div style={styles.action}>
                <WatchMan />
              </div>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          ...styles.container,
          border: isDarkMode ? "1px solid rgba(152, 161, 192, 0.24)" : "none",
          width: isTablet ? "90%" : "30%"
        }}
      >
        <div style={styles.content}>
          <Title level={2}>MultiSign ERC20 Transfer</Title>

          {isActive && (
            <>
              <Divider />
              <div style={styles.action}>
                <TransferErc20 />
              </div>
            </>
          )}
        </div>
      </div>

    </>
  );
};

export default DisplayPane;
