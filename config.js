// AWS DynamoDB Configuration
const AWS_CONFIG = {
    region: 'ap-southeast-2',
    accessKeyId: 'AKIAUOMPNW33NO5TEL7C',
    secretAccessKey: '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',
    tableName: 'timeslot'
};

// Application Configuration
const APP_CONFIG = {
    // Schedule settings
    defaultStartHour: 9,  // 9 AM
    defaultEndHour: 23,   // 11 PM (last slot will be 10:00 PM - 10:30 PM)
    slotDurationMinutes: 30, // 30 minutes per slot

    // Week settings
    daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysOfWeekShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    // Features
    enableMultiSlotBooking: true,
    maxBookingDuration: 4, // Maximum hours for a single booking

    // UI settings
    refreshInterval: 30000, // Auto-refresh every 30 seconds (in milliseconds)
    enableAutoRefresh: true,

    // Color coding for different teachers (rotates through these)
    // Ascent Taiwan inspired color palette - clean and professional
    teacherColors: [
        '#dbeafe', // light blue
        '#e0e7ff', // light indigo
        '#e0f2fe', // light sky
        '#f0f9ff', // lighter blue
        '#ede9fe', // light violet
        '#f5f3ff', // lighter purple
        '#fef3c7', // light amber
        '#fce7f3', // light pink
    ]
};

// Initialize AWS SDK
AWS.config.update({
    region: AWS_CONFIG.region,
    accessKeyId: AWS_CONFIG.accessKeyId,
    secretAccessKey: AWS_CONFIG.secretAccessKey
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
