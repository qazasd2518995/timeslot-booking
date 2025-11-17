// Global state
let currentWeekStart = null; // Will be set to Sunday of current week
let scheduleStartHour = APP_CONFIG.defaultStartHour;
let scheduleEndHour = APP_CONFIG.defaultEndHour;
let currentBookings = [];
let selectedSlot = null;
let teacherColorMap = new Map();
let autoRefreshTimer = null;
let currentUserName = null;
let isAdminMode = false;

// Admin configuration
const ADMIN_PASSWORD = 'Benjamin';

// DOM Elements
const loginModal = document.getElementById('loginModal');
const mainContainer = document.getElementById('mainContainer');
const loginForm = document.getElementById('loginForm');
const scheduleGrid = document.getElementById('scheduleGrid');
const bookingModal = document.getElementById('bookingModal');
const adminModal = document.getElementById('adminModal');
const adminLoginModal = document.getElementById('adminLoginModal');
const adminBookingManageModal = document.getElementById('adminBookingManageModal');
const adminEditModal = document.getElementById('adminEditModal');
const bookingForm = document.getElementById('bookingForm');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminEditForm = document.getElementById('adminEditForm');
const weekDisplay = document.getElementById('weekDisplay');
const searchInput = document.getElementById('searchInput');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');

// Admin booking management state
let currentEditBooking = null;
let adminWeekStart = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Check if user is already logged in
    loadUserName();

    // Login form handler
    loginForm.addEventListener('submit', handleLogin);

    // If user is already logged in, show main container
    if (currentUserName) {
        showMainApp();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('loginName').value.trim();

    if (name) {
        currentUserName = name;
        localStorage.setItem('userName', name);
        showMainApp();
    }
}

function showMainApp() {
    // Hide login modal
    loginModal.classList.remove('show');
    loginModal.style.display = 'none';

    // Show main container
    mainContainer.style.display = 'block';

    // Display current user
    document.getElementById('currentUserDisplay').textContent = currentUserName;

    // Initialize current week to this week
    setWeekToToday();

    // Load settings from localStorage
    loadSettings();

    // Event listeners
    document.getElementById('prevWeekBtn').addEventListener('click', () => changeWeek(-1));
    document.getElementById('nextWeekBtn').addEventListener('click', () => changeWeek(1));
    document.getElementById('todayBtn').addEventListener('click', () => {
        setWeekToToday();
        loadSchedule();
    });
    searchInput.addEventListener('input', handleSearch);
    document.getElementById('refreshBtn').addEventListener('click', loadSchedule);
    document.getElementById('adminBtn').addEventListener('click', openAdminLoginModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('cancelBtn').addEventListener('click', closeBookingModal);
    document.getElementById('deleteBtn').addEventListener('click', handleDeleteBooking);
    bookingForm.addEventListener('submit', handleBookingSubmit);
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    document.getElementById('cancelAdminLogin').addEventListener('click', closeAdminLoginModal);
    document.getElementById('logoutAdminBtn').addEventListener('click', logoutAdmin);

    // Modal close buttons
    document.querySelector('.close').addEventListener('click', closeBookingModal);
    document.querySelector('.admin-close').addEventListener('click', closeAdminPanel);
    document.querySelector('.admin-login-close').addEventListener('click', closeAdminLoginModal);
    document.querySelector('.admin-booking-close').addEventListener('click', closeAdminBookingManage);
    document.querySelector('.admin-edit-close').addEventListener('click', closeAdminEditModal);

    // Admin panel buttons
    document.getElementById('updateScheduleBtn').addEventListener('click', updateScheduleSettings);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllBookings);
    document.getElementById('manageBookingsBtn').addEventListener('click', openAdminBookingManage);

    // Admin edit form buttons
    document.getElementById('adminEditCancelBtn').addEventListener('click', closeAdminEditModal);
    document.getElementById('adminDeleteBtn').addEventListener('click', handleAdminDeleteBooking);
    adminEditForm.addEventListener('submit', handleAdminEditSubmit);

    // Admin week navigation
    document.getElementById('adminPrevWeekBtn').addEventListener('click', () => changeAdminWeek(-1));
    document.getElementById('adminNextWeekBtn').addEventListener('click', () => changeAdminWeek(1));
    document.getElementById('adminTodayBtn').addEventListener('click', () => {
        setAdminWeekToToday();
        loadAdminSchedule();
    });

    // Admin search
    document.getElementById('adminSearchInput').addEventListener('input', handleAdminSearch);

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === bookingModal) closeBookingModal();
        if (e.target === adminModal) closeAdminPanel();
        if (e.target === adminLoginModal) closeAdminLoginModal();
        if (e.target === adminBookingManageModal) closeAdminBookingManage();
        if (e.target === adminEditModal) closeAdminEditModal();
    });

    // Load initial schedule
    loadSchedule();

    // Setup auto-refresh
    if (APP_CONFIG.enableAutoRefresh) {
        autoRefreshTimer = setInterval(loadSchedule, APP_CONFIG.refreshInterval);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUserName = null;
        isAdminMode = false;
        localStorage.removeItem('userName');

        // Clear auto-refresh
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
        }

        // Reload page to show login screen
        location.reload();
    }
}

// Generate time slots - WEEKLY VIEW
function generateSchedule() {
    scheduleGrid.innerHTML = '';
    const weekDates = getWeekDates();

    // Create header row with day names and dates
    const cornerCell = document.createElement('div');
    cornerCell.className = 'time-label corner';
    cornerCell.textContent = 'Time';
    scheduleGrid.appendChild(cornerCell);

    weekDates.forEach((date, dayIndex) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        const dayName = APP_CONFIG.daysOfWeek[dayIndex];
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        dayHeader.innerHTML = `<div class="day-name">${dayName}</div><div class="day-date">${dateStr}</div>`;
        scheduleGrid.appendChild(dayHeader);
    });

    // Generate time slots (30-minute intervals)
    const totalMinutes = (scheduleEndHour - scheduleStartHour) * 60;
    const slotCount = totalMinutes / APP_CONFIG.slotDurationMinutes;

    for (let i = 0; i < slotCount; i++) {
        const minutes = scheduleStartHour * 60 + (i * APP_CONFIG.slotDurationMinutes);
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;

        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = formatTime(hour, minute);
        scheduleGrid.appendChild(timeLabel);

        // Create slots for each day of the week
        weekDates.forEach((date, dayIndex) => {
            const timeslot = document.createElement('div');
            timeslot.className = 'timeslot available';

            const dateStr = formatDateISO(date);
            timeslot.dataset.date = dateStr;
            timeslot.dataset.day = dayIndex;
            timeslot.dataset.hour = hour;
            timeslot.dataset.minute = minute;
            timeslot.dataset.slotId = `${dateStr}_${hour}_${minute}`;

            timeslot.addEventListener('click', () => handleSlotClick(dateStr, dayIndex, hour, minute));

            scheduleGrid.appendChild(timeslot);
        });
    }
}

// Format time display with minutes
function formatTime(hour, minute = 0) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const minuteStr = String(minute).padStart(2, '0');
    return `${displayHour}:${minuteStr} ${period}`;
}

// Format date as ISO string (YYYY-MM-DD)
function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Load schedule from DynamoDB - WEEKLY VIEW
async function loadSchedule() {
    try {
        showLoading(true);
        hideError();

        // Generate fresh schedule grid
        generateSchedule();

        // Fetch bookings from DynamoDB
        const params = {
            TableName: AWS_CONFIG.tableName
        };

        const result = await dynamoDB.scan(params).promise();
        currentBookings = result.Items || [];

        // Filter bookings for current week
        const weekDates = getWeekDates();
        const weekDateStrings = weekDates.map(d => formatDateISO(d));

        const weekBookings = currentBookings.filter(booking => {
            return weekDateStrings.includes(booking.date);
        });

        // Render bookings
        weekBookings.forEach(booking => {
            renderBooking(booking);
        });

        // Update statistics
        updateStatistics();

        showLoading(false);
    } catch (error) {
        console.error('Error loading schedule:', error);
        showError('Failed to load schedule. Please check your connection and try again.');
        showLoading(false);
    }
}

// Render a booking on the schedule - WEEKLY VIEW
function renderBooking(booking) {
    const slotId = `${booking.date}_${booking.hour}_${booking.minute || 0}`;
    const timeslot = document.querySelector(`[data-slot-id="${slotId}"]`);

    if (!timeslot) return;

    // Determine if this booking can be edited by current user
    const canEdit = canEditBooking(booking);

    // Set appropriate CSS classes
    if (canEdit) {
        timeslot.className = 'timeslot booked my-booking';
    } else {
        timeslot.className = 'timeslot booked read-only';
    }

    timeslot.dataset.bookingId = booking.timeslot;

    // Assign color to teacher
    if (!teacherColorMap.has(booking.teacherName)) {
        const colorIndex = teacherColorMap.size % APP_CONFIG.teacherColors.length;
        teacherColorMap.set(booking.teacherName, APP_CONFIG.teacherColors[colorIndex]);
    }

    timeslot.style.background = teacherColorMap.get(booking.teacherName);

    // Build booking info HTML (compact for weekly view)
    let html = `
        <div class="booking-info">
            <div class="teacher-name">${escapeHtml(booking.teacherName)}</div>
    `;

    if (booking.notes) {
        html += `<div class="notes">${escapeHtml(booking.notes)}</div>`;
    }

    // Add lock icon for read-only bookings
    if (!canEdit) {
        html += `<div style="margin-top: 2px; font-size: 0.75rem; color: var(--text-tertiary);">🔒</div>`;
    }

    html += `</div>`;
    timeslot.innerHTML = html;
}

// Handle slot click - WEEKLY VIEW
function handleSlotClick(date, dayIndex, hour, minute) {
    const slotId = `${date}_${hour}_${minute}`;
    const timeslot = document.querySelector(`[data-slot-id="${slotId}"]`);
    const bookingId = timeslot.dataset.bookingId;

    selectedSlot = { date, dayIndex, hour, minute, slotId };

    if (bookingId) {
        // Edit existing booking
        const booking = currentBookings.find(b => b.timeslot === bookingId);
        if (booking) {
            // Check if user has permission to edit
            if (canEditBooking(booking)) {
                openBookingModal(booking);
            } else {
                showError('You do not have permission to edit this booking. Only the creator or admin can modify it.');
            }
        }
    } else {
        // New booking
        openBookingModal(null);
    }
}

// Check if current user can edit a booking
function canEditBooking(booking) {
    // IMPORTANT: Only check admin mode, don't apply it to main page
    // Admin mode should only work in Admin Panel, not on main page

    // Owner can edit their own bookings
    if (currentUserName && booking.teacherName === currentUserName) return true;

    return false;
}

// Open booking modal
function openBookingModal(booking = null) {
    bookingForm.reset();

    // Always set teacher name to current user (locked field)
    document.getElementById('teacherName').value = currentUserName;

    // Display slot date/time information
    if (selectedSlot) {
        const slotDate = new Date(selectedSlot.date);
        const dayOfWeek = APP_CONFIG.daysOfWeek[selectedSlot.dayIndex];
        const monthDay = `${slotDate.getMonth() + 1}/${slotDate.getDate()}`;
        const timeStr = formatTime(selectedSlot.hour, selectedSlot.minute);

        document.getElementById('slotInfo').innerHTML = `
            <strong>${dayOfWeek}, ${monthDay}</strong> at <strong>${timeStr}</strong>
        `;
    }

    if (booking) {
        // Edit mode
        document.getElementById('modalTitle').textContent = 'Edit Booking';
        document.getElementById('notes').value = booking.notes || '';
        document.getElementById('deleteBtn').style.display = 'block';
    } else {
        // New booking mode
        document.getElementById('modalTitle').textContent = 'Book Timeslot';
        document.getElementById('deleteBtn').style.display = 'none';
    }

    bookingModal.classList.add('show');
}

// Close booking modal
function closeBookingModal() {
    bookingModal.classList.remove('show');
    selectedSlot = null;
}

// Handle booking form submission - WEEKLY VIEW
async function handleBookingSubmit(e) {
    e.preventDefault();

    if (!selectedSlot) return;

    const teacherName = document.getElementById('teacherName').value.trim();
    const notes = document.getElementById('notes').value.trim();

    // Create booking ID (single slot only - no multi-hour bookings)
    const timeslotId = `${selectedSlot.date}_${selectedSlot.hour}_${selectedSlot.minute}`;

    // Check if this is an update to existing booking
    const existingBooking = currentBookings.find(b => b.timeslot === timeslotId);

    const booking = {
        timeslot: timeslotId,
        date: selectedSlot.date,
        dayOfWeek: selectedSlot.dayIndex,
        hour: selectedSlot.hour,
        minute: selectedSlot.minute,
        teacherName,
        notes,
        createdAt: existingBooking ? existingBooking.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        // Save to DynamoDB
        const params = {
            TableName: AWS_CONFIG.tableName,
            Item: booking
        };

        await dynamoDB.put(params).promise();

        closeBookingModal();
        await loadSchedule();

    } catch (error) {
        console.error('Error saving booking:', error);
        showError('Failed to save booking. Please try again.');
    }
}

// Handle delete booking - WEEKLY VIEW
async function handleDeleteBooking() {
    if (!selectedSlot) return;

    if (!confirm('Are you sure you want to delete this booking?')) {
        return;
    }

    const timeslotId = `${selectedSlot.date}_${selectedSlot.hour}_${selectedSlot.minute}`;

    try {
        // Delete booking
        await dynamoDB.delete({
            TableName: AWS_CONFIG.tableName,
            Key: { timeslot: timeslotId }
        }).promise();

        closeBookingModal();
        await loadSchedule();

    } catch (error) {
        console.error('Error deleting booking:', error);
        showError('Failed to delete booking. Please try again.');
    }
}

// Handle search/filter
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const timeslots = document.querySelectorAll('#scheduleGrid .timeslot');

    // If search is empty, reset all slots
    if (searchTerm === '') {
        timeslots.forEach(slot => {
            slot.style.opacity = '1';
            slot.style.boxShadow = '';
            slot.style.transform = '';
            slot.style.zIndex = '';
            slot.style.border = '';
        });
        return;
    }

    timeslots.forEach(slot => {
        const bookingInfo = slot.querySelector('.booking-info');

        // Skip empty slots
        if (!bookingInfo) {
            slot.style.opacity = '0.15';
            slot.style.boxShadow = '';
            slot.style.transform = '';
            slot.style.zIndex = '';
            slot.style.border = '';
            return;
        }

        // Get teacher name from the booking
        const teacherNameElement = bookingInfo.querySelector('.teacher-name');
        if (!teacherNameElement) {
            slot.style.opacity = '0.15';
            return;
        }

        const teacherName = teacherNameElement.textContent.toLowerCase();

        // Check if teacher name matches search
        if (teacherName.includes(searchTerm)) {
            // Highlight matched slots
            slot.style.opacity = '1';
            slot.style.boxShadow = '0 0 0 3px var(--primary-color), 0 4px 12px rgba(17, 109, 255, 0.4)';
            slot.style.transform = 'scale(1.05)';
            slot.style.zIndex = '10';
            slot.style.border = '2px solid var(--primary-color)';
        } else {
            // Dim non-matched booked slots
            slot.style.opacity = '0.15';
            slot.style.boxShadow = '';
            slot.style.transform = '';
            slot.style.zIndex = '';
            slot.style.border = '';
        }
    });
}

// Update statistics - WEEKLY VIEW
function updateStatistics() {
    const totalMinutes = (scheduleEndHour - scheduleStartHour) * 60;
    const slotsPerDay = totalMinutes / APP_CONFIG.slotDurationMinutes;
    const totalSlots = slotsPerDay * 7; // 7 days

    const weekDates = getWeekDates();
    const weekDateStrings = weekDates.map(d => formatDateISO(d));
    const weekBookings = currentBookings.filter(b => weekDateStrings.includes(b.date));

    const bookedSlots = weekBookings.length;
    const availableSlots = totalSlots - bookedSlots;

    document.getElementById('totalSlots').textContent = totalSlots;
    document.getElementById('bookedSlots').textContent = bookedSlots;
    document.getElementById('availableSlots').textContent = availableSlots;
}

// Admin authentication functions
function openAdminLoginModal() {
    document.getElementById('adminPassword').value = '';
    adminLoginModal.classList.add('show');
}

function closeAdminLoginModal() {
    adminLoginModal.classList.remove('show');
}

async function handleAdminLogin(e) {
    e.preventDefault();

    const password = document.getElementById('adminPassword').value;

    if (password === ADMIN_PASSWORD) {
        isAdminMode = true;
        closeAdminLoginModal();
        openAdminPanel();
        showError('Admin mode activated. You can now edit all bookings.');
        setTimeout(hideError, 3000);
    } else {
        showError('Incorrect admin password. Please try again.');
    }
}

function logoutAdmin() {
    isAdminMode = false;
    closeAdminPanel();
    showError('Logged out of admin mode.');
    setTimeout(hideError, 2000);
}

// Admin panel functions
function openAdminPanel() {
    document.getElementById('startHour').value = scheduleStartHour;
    document.getElementById('endHour').value = scheduleEndHour;
    updateAdminStats();
    adminModal.classList.add('show');
}

function closeAdminPanel() {
    adminModal.classList.remove('show');
}

// Load/save user name
function loadUserName() {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
        currentUserName = savedName;
    }
}

function updateAdminStats() {
    // Get today's date in ISO format
    const today = new Date();
    const todayStr = formatDateISO(today);

    // Get current week's bookings
    const weekDates = getWeekDates();
    const weekDateStrings = weekDates.map(d => formatDateISO(d));
    const weekBookings = currentBookings.filter(b => weekDateStrings.includes(b.date));

    const stats = {
        totalBookings: currentBookings.length,
        todayBookings: currentBookings.filter(b => b.date === todayStr).length,
        weekBookings: weekBookings.length,
        uniqueTeachers: new Set(currentBookings.map(b => b.teacherName)).size
    };

    document.getElementById('adminStats').innerHTML = `
        <p><strong>Total Bookings (All Dates):</strong> ${stats.totalBookings}</p>
        <p><strong>Today's Bookings:</strong> ${stats.todayBookings}</p>
        <p><strong>Current Week's Bookings:</strong> ${stats.weekBookings}</p>
        <p><strong>Unique Teachers:</strong> ${stats.uniqueTeachers}</p>
    `;
}

function updateScheduleSettings() {
    const newStart = parseInt(document.getElementById('startHour').value);
    const newEnd = parseInt(document.getElementById('endHour').value);

    if (newStart >= newEnd) {
        alert('Start hour must be before end hour');
        return;
    }

    if (newStart < 0 || newEnd > 24) {
        alert('Hours must be between 0 and 24');
        return;
    }

    scheduleStartHour = newStart;
    scheduleEndHour = newEnd;

    // Save to localStorage
    saveSettings();

    loadSchedule();
    closeAdminPanel();
}

function saveSettings() {
    localStorage.setItem('scheduleStartHour', scheduleStartHour);
    localStorage.setItem('scheduleEndHour', scheduleEndHour);
}

function loadSettings() {
    const savedStart = localStorage.getItem('scheduleStartHour');
    const savedEnd = localStorage.getItem('scheduleEndHour');

    if (savedStart) scheduleStartHour = parseInt(savedStart);
    if (savedEnd) scheduleEndHour = parseInt(savedEnd);
}

async function clearAllBookings() {
    if (!confirm('Are you sure you want to delete ALL bookings? This cannot be undone!')) {
        return;
    }

    if (!confirm('This will permanently delete all data. Are you absolutely sure?')) {
        return;
    }

    try {
        // Get all bookings
        const params = {
            TableName: AWS_CONFIG.tableName
        };

        const result = await dynamoDB.scan(params).promise();
        const items = result.Items || [];

        // Delete each item
        for (const item of items) {
            await dynamoDB.delete({
                TableName: AWS_CONFIG.tableName,
                Key: { timeslot: item.timeslot }
            }).promise();
        }

        alert('All bookings have been deleted.');
        closeAdminPanel();
        await loadSchedule();

    } catch (error) {
        console.error('Error clearing bookings:', error);
        alert('Failed to clear bookings. Please try again.');
    }
}

function exportToCSV() {
    if (currentBookings.length === 0) {
        alert('No bookings to export.');
        return;
    }

    // Create CSV content
    const headers = ['Date', 'Time', 'Teacher Name', 'Notes'];
    const rows = currentBookings.map(b => [
        b.date,
        formatTime(b.hour, b.minute || 0),
        b.teacherName,
        b.notes || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeslot-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Utility functions
function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    errorMessage.classList.remove('show');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Week navigation functions
function setWeekToToday() {
    const today = new Date();
    // Get Sunday of this week
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    currentWeekStart = sunday;
    updateWeekDisplay();
}

function changeWeek(direction) {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    currentWeekStart = newDate;
    updateWeekDisplay();
    loadSchedule();
}

function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);

    const formatDate = (date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    };

    weekDisplay.textContent = `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;
}

function getWeekDates() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Admin Booking Management Functions
function openAdminBookingManage() {
    setAdminWeekToToday();
    loadAdminSchedule();
    adminBookingManageModal.classList.add('show');
}

function closeAdminBookingManage() {
    adminBookingManageModal.classList.remove('show');
}

function setAdminWeekToToday() {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    adminWeekStart = sunday;
    updateAdminWeekDisplay();
}

function changeAdminWeek(direction) {
    const newDate = new Date(adminWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    adminWeekStart = newDate;
    updateAdminWeekDisplay();
    loadAdminSchedule();
}

function updateAdminWeekDisplay() {
    const weekEnd = new Date(adminWeekStart);
    weekEnd.setDate(adminWeekStart.getDate() + 6);

    const formatDate = (date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    };

    document.getElementById('adminWeekDisplay').textContent = `${formatDate(adminWeekStart)} - ${formatDate(weekEnd)}`;
}

function getAdminWeekDates() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(adminWeekStart);
        date.setDate(adminWeekStart.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function generateAdminSchedule() {
    const adminScheduleGrid = document.getElementById('adminScheduleGrid');
    adminScheduleGrid.innerHTML = '';
    const weekDates = getAdminWeekDates();

    // Create header row
    const cornerCell = document.createElement('div');
    cornerCell.className = 'time-label corner';
    cornerCell.textContent = 'Time';
    adminScheduleGrid.appendChild(cornerCell);

    weekDates.forEach((date, dayIndex) => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        const dayName = APP_CONFIG.daysOfWeek[dayIndex];
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        dayHeader.innerHTML = `<div class="day-name">${dayName}</div><div class="day-date">${dateStr}</div>`;
        adminScheduleGrid.appendChild(dayHeader);
    });

    // Generate time slots
    const totalMinutes = (scheduleEndHour - scheduleStartHour) * 60;
    const slotCount = totalMinutes / APP_CONFIG.slotDurationMinutes;

    for (let i = 0; i < slotCount; i++) {
        const minutes = scheduleStartHour * 60 + (i * APP_CONFIG.slotDurationMinutes);
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;

        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = formatTime(hour, minute);
        adminScheduleGrid.appendChild(timeLabel);

        // Create slots for each day
        weekDates.forEach((date, dayIndex) => {
            const timeslot = document.createElement('div');
            timeslot.className = 'timeslot available';

            const dateStr = formatDateISO(date);
            timeslot.dataset.date = dateStr;
            timeslot.dataset.day = dayIndex;
            timeslot.dataset.hour = hour;
            timeslot.dataset.minute = minute;
            timeslot.dataset.slotId = `${dateStr}_${hour}_${minute}`;

            timeslot.addEventListener('click', () => handleAdminSlotClick(dateStr, dayIndex, hour, minute));

            adminScheduleGrid.appendChild(timeslot);
        });
    }
}

async function loadAdminSchedule() {
    try {
        generateAdminSchedule();

        // Fetch all bookings
        const params = {
            TableName: AWS_CONFIG.tableName
        };

        const result = await dynamoDB.scan(params).promise();
        const allBookings = result.Items || [];

        // Filter bookings for current week
        const weekDates = getAdminWeekDates();
        const weekDateStrings = weekDates.map(d => formatDateISO(d));

        const weekBookings = allBookings.filter(booking => {
            return weekDateStrings.includes(booking.date);
        });

        // Render bookings
        weekBookings.forEach(booking => {
            renderAdminBooking(booking);
        });

    } catch (error) {
        console.error('Error loading admin schedule:', error);
        showError('Failed to load schedule. Please try again.');
    }
}

function renderAdminBooking(booking) {
    const slotId = `${booking.date}_${booking.hour}_${booking.minute || 0}`;
    const timeslot = document.querySelector(`#adminScheduleGrid [data-slot-id="${slotId}"]`);

    if (!timeslot) return;

    // All bookings are editable in admin mode
    timeslot.className = 'timeslot booked my-booking';
    timeslot.dataset.bookingId = booking.timeslot;

    // Assign color to teacher
    if (!teacherColorMap.has(booking.teacherName)) {
        const colorIndex = teacherColorMap.size % APP_CONFIG.teacherColors.length;
        teacherColorMap.set(booking.teacherName, APP_CONFIG.teacherColors[colorIndex]);
    }

    timeslot.style.background = teacherColorMap.get(booking.teacherName);

    // Build booking info HTML
    let html = `
        <div class="booking-info">
            <div class="teacher-name">${escapeHtml(booking.teacherName)}</div>
    `;

    if (booking.notes) {
        html += `<div class="notes">${escapeHtml(booking.notes)}</div>`;
    }

    html += `</div>`;
    timeslot.innerHTML = html;
}

function handleAdminSlotClick(date, dayIndex, hour, minute) {
    const slotId = `${date}_${hour}_${minute}`;
    const timeslot = document.querySelector(`#adminScheduleGrid [data-slot-id="${slotId}"]`);
    const bookingId = timeslot.dataset.bookingId;

    if (bookingId) {
        // Edit existing booking
        const booking = currentBookings.find(b => b.timeslot === bookingId);
        if (booking) {
            openAdminEditModal(booking);
        }
    } else {
        // Create new booking
        openAdminNewBookingModal(date, dayIndex, hour, minute);
    }
}

// Handle admin search/filter
function handleAdminSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const timeslots = document.querySelectorAll('#adminScheduleGrid .timeslot');

    // If search is empty, reset all slots
    if (searchTerm === '') {
        timeslots.forEach(slot => {
            slot.style.opacity = '1';
            slot.style.boxShadow = '';
            slot.style.transform = '';
            slot.style.zIndex = '';
            slot.style.border = '';
        });
        return;
    }

    timeslots.forEach(slot => {
        const bookingInfo = slot.querySelector('.booking-info');

        // Skip empty slots
        if (!bookingInfo) {
            slot.style.opacity = '0.15';
            slot.style.boxShadow = '';
            slot.style.transform = '';
            slot.style.zIndex = '';
            slot.style.border = '';
            return;
        }

        // Get teacher name from the booking
        const teacherNameElement = bookingInfo.querySelector('.teacher-name');
        if (!teacherNameElement) {
            slot.style.opacity = '0.15';
            return;
        }

        const teacherName = teacherNameElement.textContent.toLowerCase();

        // Check if teacher name matches search
        if (teacherName.includes(searchTerm)) {
            // Highlight matched slots
            slot.style.opacity = '1';
            slot.style.boxShadow = '0 0 0 3px var(--primary-color), 0 4px 12px rgba(17, 109, 255, 0.4)';
            slot.style.transform = 'scale(1.05)';
            slot.style.zIndex = '10';
            slot.style.border = '2px solid var(--primary-color)';
        } else {
            // Dim non-matched booked slots
            slot.style.opacity = '0.15';
            slot.style.boxShadow = '';
            slot.style.transform = '';
            slot.style.zIndex = '';
            slot.style.border = '';
        }
    });
}

function openAdminNewBookingModal(date, dayIndex, hour, minute) {
    // Create a new booking object for the selected slot
    currentEditBooking = {
        timeslot: `${date}_${hour}_${minute}`,
        date: date,
        dayOfWeek: dayIndex,
        hour: hour,
        minute: minute,
        teacherName: '',
        notes: '',
        isNew: true
    };

    document.getElementById('adminEditTitle').textContent = 'Add New Booking (Admin)';
    document.getElementById('adminTeacherName').value = '';
    document.getElementById('adminNotes').value = '';

    // Hide delete button for new bookings
    document.getElementById('adminDeleteBtn').style.display = 'none';

    adminEditModal.classList.add('show');
}

function openAdminEditModal(booking) {
    currentEditBooking = booking;

    document.getElementById('adminEditTitle').textContent = 'Edit Booking (Admin)';
    document.getElementById('adminTeacherName').value = booking.teacherName || '';
    document.getElementById('adminNotes').value = booking.notes || '';

    // Show delete button for existing bookings
    document.getElementById('adminDeleteBtn').style.display = 'block';

    adminEditModal.classList.add('show');
}

function closeAdminEditModal() {
    adminEditModal.classList.remove('show');
    currentEditBooking = null;
}

async function handleAdminEditSubmit(e) {
    e.preventDefault();

    if (!currentEditBooking) return;

    const teacherName = document.getElementById('adminTeacherName').value.trim();
    const notes = document.getElementById('adminNotes').value.trim();

    if (!teacherName) {
        showError('Teacher name is required!');
        return;
    }

    const isNew = currentEditBooking.isNew;
    const now = new Date().toISOString();

    const updatedBooking = {
        timeslot: currentEditBooking.timeslot,
        date: currentEditBooking.date,
        dayOfWeek: currentEditBooking.dayOfWeek,
        hour: currentEditBooking.hour,
        minute: currentEditBooking.minute,
        teacherName,
        notes,
        createdAt: isNew ? now : (currentEditBooking.createdAt || now),
        updatedAt: now
    };

    try {
        const params = {
            TableName: AWS_CONFIG.tableName,
            Item: updatedBooking
        };

        await dynamoDB.put(params).promise();

        closeAdminEditModal();
        await loadSchedule();
        loadAdminSchedule();

        showError(isNew ? 'Booking created successfully!' : 'Booking updated successfully!');
        setTimeout(hideError, 2000);
    } catch (error) {
        console.error('Error saving booking:', error);
        showError('Failed to save booking. Please try again.');
    }
}

async function handleAdminDeleteBooking() {
    if (!currentEditBooking) return;

    if (!confirm(`Are you sure you want to delete this booking?\n\nTeacher: ${currentEditBooking.teacherName}\nDate: ${currentEditBooking.date}\nTime: ${formatTime(currentEditBooking.hour, currentEditBooking.minute || 0)}`)) {
        return;
    }

    try {
        await dynamoDB.delete({
            TableName: AWS_CONFIG.tableName,
            Key: { timeslot: currentEditBooking.timeslot }
        }).promise();

        closeAdminEditModal();
        await loadSchedule();
        loadAdminSchedule();

        showError('Booking deleted successfully!');
        setTimeout(hideError, 2000);
    } catch (error) {
        console.error('Error deleting booking:', error);
        showError('Failed to delete booking. Please try again.');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
});
