# Teacher Timeslot Booking System

A professional, full-featured timeslot booking system for teachers to schedule their classes throughout the day. Built with vanilla JavaScript and AWS DynamoDB for real-time data synchronization.

## Features

### Core Functionality
- **Visual Time Grid**: Interactive hourly timeslots from 8 AM to 6 PM (customizable)
- **Easy Booking**: Click any available slot to book with teacher and course information
- **Real-time Sync**: All changes are instantly saved to AWS DynamoDB
- **Edit & Delete**: Modify or cancel existing bookings
- **Multi-hour Booking**: Book consecutive timeslots for longer classes
- **Search & Filter**: Quickly find bookings by teacher name or course

### Teacher Information Captured
- Teacher Name (required - for identification and ownership)
- Course Name (required)
- Course Code (optional)
- Expected Student Count (optional)
- Duration (1-4 hours)
- Notes/Remarks (optional)

### Permission & Access Control 🔒
- **Name-based Ownership**: Each booking is tied to the teacher's name
- **Edit Your Own Bookings**: Only you can edit or delete bookings made with your name
- **Read-only View**: Other teachers' bookings are visible but cannot be modified
- **Admin Override**: Administrator can edit/delete all bookings with password authentication
- **Visual Indicators**: Color-coded slots show which bookings you can edit (My Bookings) vs view-only (Others' Bookings)

### Visual Features
- **Color Coding**: Each teacher gets a unique color for easy identification
- **Availability Indicators**: Clear visual distinction between available and booked slots
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Statistics Dashboard**: Real-time stats showing total, booked, and available slots

### Admin Panel 🔐
- **Password Protection**: Admin password is "Benjamin"
- **Full Access**: Edit and delete all bookings regardless of ownership
- **Schedule Management**: Customize schedule hours (start/end time)
- **Data Export**: Export all bookings to CSV
- **Bulk Operations**: Clear all bookings (with double confirmation)
- **System Statistics**: View comprehensive booking statistics

### Advanced Features
- Auto-refresh every 30 seconds (configurable)
- Conflict prevention - no double bookings
- Multi-slot booking validation
- Local storage for schedule preferences
- Professional UI with smooth animations

## Setup Instructions

### 1. AWS DynamoDB Setup

The system is already configured to connect to your DynamoDB table with these settings:
- **Region**: ap-southeast-2
- **Table Name**: timeslot
- **Partition Key**: timeslot (String)

**IMPORTANT SECURITY NOTE**: The AWS credentials are currently hardcoded in `config.js`. For production use, you should:
1. Move credentials to environment variables or AWS Cognito
2. Use AWS IAM roles with appropriate permissions
3. Never commit credentials to version control

### 2. DynamoDB Permissions Required

Your AWS IAM user needs these DynamoDB permissions:
- `dynamodb:PutItem` - Create/update bookings
- `dynamodb:DeleteItem` - Delete bookings
- `dynamodb:Scan` - Load all bookings
- `dynamodb:GetItem` - Retrieve specific bookings

### 3. Running the Application

Simply open `index.html` in a web browser:

```bash
# Option 1: Open directly
open index.html

# Option 2: Use a local server (recommended)
python3 -m http.server 8000
# Then visit: http://localhost:8000

# Option 3: Use Node.js
npx http-server
```

## File Structure

```
timeslot/
├── index.html      # Main HTML structure
├── styles.css      # All styling and responsive design
├── config.js       # AWS and application configuration
├── app.js          # Core application logic
└── README.md       # This file
```

## Usage Guide

### Booking a Timeslot

1. Select a date using the date picker (defaults to today)
2. Click on any **available** timeslot (shown in light green)
3. Fill in the booking form:
   - **Enter your teacher name** (This identifies you as the owner)
   - Enter course name
   - Optionally add course code, student count, and notes
   - Select duration if booking multiple hours
4. Click "Book Timeslot"
5. Your name will be remembered for future bookings

### Editing Your Booking

1. Click on any of **your bookings** (shown in light blue with "My Bookings" indicator)
2. Modify the information in the form (teacher name cannot be changed)
3. Click "Book Timeslot" to save changes
4. Or click "Delete Booking" to remove it

**Note**: You cannot edit other teachers' bookings. Those slots will show in light red with "🔒 View Only" and clicking them will display an error message.

### Using Admin Panel

1. Click "Admin Panel" button
2. Enter admin password: **Benjamin**
3. Once logged in, you can:
   - Edit/delete ANY booking (full access)
   - Change schedule hours
   - Export data to CSV
   - Clear all bookings
   - View system statistics
4. Click "Logout" when done to return to normal user mode

### Using Search

Type in the search box to filter bookings by:
- Teacher name
- Course name
- Course code
- Notes

Non-matching bookings will fade out for easy identification.

### Admin Functions

Click the "Admin Panel" button to:
- **Change Schedule Hours**: Adjust start/end times (e.g., 7 AM - 9 PM)
- **Export Data**: Download all bookings as CSV for Excel/spreadsheet use
- **Clear All Bookings**: Remove all data (use with caution!)
- **View Statistics**: See total bookings, teachers, and courses

## Configuration Options

Edit `config.js` to customize:

```javascript
APP_CONFIG = {
    defaultStartHour: 8,        // Schedule start time
    defaultEndHour: 18,         // Schedule end time
    slotDurationMinutes: 60,    // Minutes per slot
    maxBookingDuration: 4,      // Max hours per booking
    refreshInterval: 30000,     // Auto-refresh interval (ms)
    enableAutoRefresh: true,    // Enable/disable auto-refresh
}
```

## Data Structure

Each booking in DynamoDB has this structure:

```javascript
{
    timeslot: "2025-11-17_14",          // Partition key: date_hour
    date: "2025-11-17",                 // ISO date string
    hour: 14,                           // Hour (24h format)
    teacherName: "John Smith",          // Teacher's name (for permissions)
    courseName: "Advanced Math",        // Course name
    courseCode: "MATH401",              // Optional course code
    duration: 2,                        // Hours (1-4)
    studentCount: 30,                   // Expected students
    notes: "Bring calculators",         // Additional notes
    createdAt: "2025-11-17T...",       // Creation timestamp
    updatedAt: "2025-11-17T..."        // Last modified timestamp
}
```

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ✅ Responsive design

## Troubleshooting

### "Failed to load schedule" Error
- Check AWS credentials in `config.js`
- Verify DynamoDB table name is correct
- Ensure IAM permissions are properly configured
- Check browser console for detailed error messages

### Bookings Not Appearing
- Verify the correct date is selected
- Click the "Refresh" button
- Check browser console for errors
- Verify DynamoDB table has data

### Auto-refresh Not Working
- Ensure `enableAutoRefresh` is `true` in `config.js`
- Check browser console for errors
- Try manually refreshing

## Future Enhancement Ideas

1. **User Authentication**: Add login system for teachers
2. **Email Notifications**: Send confirmation emails
3. **Recurring Bookings**: Weekly/daily recurring schedules
4. **Room Assignment**: Link timeslots to specific rooms
5. **Calendar View**: Month/week view options
6. **Conflict Warnings**: Alert if similar courses overlap
7. **Student View**: Read-only view for students to see schedule
8. **Print Layout**: Printer-friendly schedule format
9. **Import/Export**: Import from CSV or other systems
10. **Multi-day View**: See entire week at once

## Security Considerations

⚠️ **IMPORTANT**: This is a development setup. For production:

1. **Remove Hardcoded Credentials**: Use AWS Cognito or environment variables
2. **Add Authentication**: Implement user login system
3. **Enable HTTPS**: Use SSL/TLS for data transmission
4. **Input Validation**: Add server-side validation
5. **Rate Limiting**: Prevent abuse of DynamoDB API
6. **Access Control**: Restrict who can delete/edit bookings
7. **Audit Logging**: Track who made changes and when

## License

This project is open source and available for educational purposes.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify AWS DynamoDB connection
3. Review this README documentation
4. Check DynamoDB table permissions

---

Built with ❤️ for educators
