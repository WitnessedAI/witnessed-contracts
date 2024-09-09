import { Buffer } from "buffer";

import { useState } from "react";

import { Layout, ConfigProvider, theme } from "antd";

import DisplayPane from "components/displayPane/DisplayPane";
import { CustomHeader, MainContent } from "layout";

import "styles/App.css";

const styles = {
  layout: {
    width: "100vw",
    height: "100vh",
    overflow: "auto",
    fontFamily: "Sora, sans-serif"
  }
} as const;


export const ENVS = {
    ERC20_ADDRESS: process.env.REACT_APP_ERC20_ADDRESS || "",
    SAFE_ADDRESS: process.env.REACT_APP_SAFE_ADDRESS || "",
    TREASURY_ADDRESS: process.env.REACT_APP_TREASURY_ADDRESS || ""
}

function App() {
  const { defaultAlgorithm, darkAlgorithm } = theme;
  const [isDarkMode, setIsDarkMode] = useState(true);
  if (!window.Buffer) window.Buffer = Buffer;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm
      }}
    >
      <Layout style={styles.layout}>
        <CustomHeader isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <MainContent>
          <DisplayPane isDarkMode={isDarkMode} />
        </MainContent>
        {/* <CustomFooter /> */}
      </Layout>
    </ConfigProvider>
  );
}

export default App;
