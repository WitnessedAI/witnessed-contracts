import fs from "fs";

const path = "additional_deployments.json";
export class AdditionalDeploymentStorage {
  public static getDeployments(_path?: string): {
    [contractName: string]: string;
  } {
    // create the file if it doesn't exist
    if (!fs.existsSync(_path || path)) {
      fs.writeFileSync(_path || path, "{}");
    }
    return JSON.parse(fs.readFileSync(path, "utf8"));
  }

  public static insertDeploymentAddressToFile(
    contractName: string,
    address: string,
    _path?: string
  ): void {
    const deployments = this.getDeployments(_path || path);
    // Add the new deployment address to the parsed object
    deployments[contractName] = address;
    // Write the updated object to the file
    fs.writeFileSync(path, JSON.stringify(deployments, null, 2));
  }
}
