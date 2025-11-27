
if (location.hostname === "namu-dw.com") {
  apiGlobalURL = "https://250204.aisystem64.org";
  console.log("Using Production API URL");
} else if (location.hostname === "rr720.synology.me") {
  apiGlobalURL = "http://127.0.0.1:8000";
//   apiGlobalURL = "https://250204.aisystem64.org";
  console.log("Using Local API URL");
}