import urllib.request
import urllib.parse
import json
import sys

base_url = "http://127.0.0.1:8000"

# Login
try:
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from services.auth_service import AuthService
    token = AuthService().create_token("Q/A Lab")
except Exception as e:
    print("Token generation failed:", e)
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Use filenames that are present in the uploads directory
payload = {
    "heat_no": "A0226159",
    "casting_name": "HOLLOW SHAFT",
    "metallurgy_filename": "Furnace A,B,C,D&E- Metallurgical test record...xls",
    "mechanical_requirements_filename": "mechanical_specified.xlsx"
}
print("Testing search_heat_no...")
req = urllib.request.Request(f"{base_url}/api/search_heat_no", data=json.dumps(payload).encode("utf-8"), headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        search_data = json.loads(response.read().decode("utf-8"))
except Exception as e:
    print("Search failed:", e)
    sys.exit(1)

print("Search basic_info:", search_data.get("basic_info"))
print("Search mech_specified:", search_data.get("mechanical_specified"))

print("\nTesting download_report...")
dl_payload = search_data
dl_payload["template_filename"] = "template_ce2abe1861_MTC-HS-30B.xlsx"
req = urllib.request.Request(f"{base_url}/api/download_report", data=json.dumps(dl_payload).encode("utf-8"), headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        content = response.read()
        print("Download successful! Saved bytes:", len(content))
except Exception as e:
    print("Download failed:", e)
