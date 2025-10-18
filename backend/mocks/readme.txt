Mock data for identity systems lives here.

Summary of Changes
Updated Mock Data Files:

✅ ping-directory-details.json - Added data for all users u1001-u1020
✅ ping-federate-details.json - Added data for all users u1001-u1020
✅ cyberark-details.json - Added data for u1001, u1002, u1006, u1013, u1019 (users with privileged access)
✅ saviynt-details.json - Added data for u1001, u1002, u1005, u1008, u1010, u1015, u1018 (users with role assignments)
✅ azure-ad-details.json - Added data for u1001, u1002, u1003, u1007, u1009, u1012, u1016, u1020 (users with Azure AD)
✅ ping-mfa-details.json - Added data for all users u1001-u1020
Updated API Route: 7. ✅ search-employee/[id]/details/route.ts - Modified to handle the new keyed structure (data organized by userId)

New Data Structure
The mock files now use a keyed structure where each user's data is stored under their userId:

{
  "u1001": { /* Alice's data */ },
  "u1009": { /* Ian's data */ },
  "u1020": { /* Tina's data */ }
}
Test It Now! 🎉
Search for "u1009" (Ian Chen)
Each system card will now show Ian's specific data instead of Alice's
Try searching for different users (u1001-u1020) and you'll see varied, realistic data
The system will now correctly fetch user-specific data from the mock files, giving you accurate representation of each employee's identity information across all systems! 🚀