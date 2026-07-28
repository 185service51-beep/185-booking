// Admin Dashboard Logic - 185Service Booking System

// ⚠️ ต้องตรงกับ URL ของ Google Apps Script Web App ของคุณ
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzXkq_P31Exsqp4LCCLRwiRb2gPZgIG-g4aFlxgx_mGm_JHHCvzRfV06-up810e0APw/exec";

// กำหนดรหัสผ่านสำหรับการเข้าถึงหน้า Admin Panel (สามารถแก้ไขได้ที่นี่)
const ADMIN_PIN = "185SERVICE"; 

let bookingsList = [];

// ตรวจสอบสถานะการเข้าระบบเมื่อโหลดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("adminLoggedIn") === "true") {
    showDashboard();
  }
});

// ฟังก์ชันล็อกอินแอดมิน
function handleLogin(event) {
  event.preventDefault();
  const inputPin = document.getElementById("adminPin").value;
  
  if (inputPin === ADMIN_PIN || inputPin.toUpperCase() === ADMIN_PIN) {
    sessionStorage.setItem("adminLoggedIn", "true");
    showDashboard();
  } else {
    alert("❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    document.getElementById("adminPin").value = "";
  }
}

// แสดงหน้า Dashboard โหลดข้อมูลคิวทั้งหมด
function showDashboard() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("dashboardScreen").classList.remove("hidden");
  loadBookings();
  loadLineQuota();
}

// ฟังก์ชันออกจากระบบ
function handleLogout() {
  sessionStorage.removeItem("adminLoggedIn");
  document.getElementById("dashboardScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("adminPin").value = "";
}

// โหลดข้อมูลจาก Google Sheets ผ่าน GAS Web App
async function loadBookings() {
  const tableBody = document.getElementById("bookingsTableBody");
  tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-light);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูลตารางคิว...</td></tr>`;

  if (!GAS_API_URL || GAS_API_URL.includes("YOUR_GAS")) {
    alert("⚠️ กรุณาตั้งค่า GAS_API_URL ในไฟล์ admin.js ก่อนใช้งาน");
    return;
  }

  try {
    const response = await fetch(`${GAS_API_URL}?action=getAllBookings`);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const result = await response.json();
    if (result.status === "success") {
      bookingsList = result.data;
      filterBookings();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ไม่สามารถเชื่อมต่อระบบหลังบ้านได้ (${error.message})</td></tr>`;
  }
}

// ช่วยดึงวันที่วันนี้ในรูปแบบ YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ช่วยดึงวันที่พรุ่งนี้ในรูปแบบ YYYY-MM-DD
function getTomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// เรนเดอร์ตารางข้อมูล
function renderBookingsTable(data) {
  const tableBody = document.getElementById("bookingsTableBody");
  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-light); padding: 30px;">ไม่พบข้อมูลการจองคิวตามเงื่อนไขที่เลือก</td></tr>`;
    return;
  }

  const todayStr = getTodayString();

  data.forEach(item => {
    const tr = document.createElement("tr");
    
    // ตั้งรูปแบบสถานะ Badge
    let badgeClass = "badge-success";
    let statusText = "ปกติ";
    if (item.status === "ยกเลิก" || item.status === "ยกเลิกคิว" || item.status.includes("ยกเลิก")) {
      badgeClass = "badge-danger";
      statusText = "ยกเลิกแล้ว";
    }

    const isToday = item.date === todayStr;
    const todayBadge = isToday ? `<span style="background: rgba(6,185,80,0.2); color: #4ade80; border: 1px solid rgba(6,185,80,0.4); font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-left: 6px;">🔥 วันนี้</span>` : '';

    tr.innerHTML = `
      <td data-label="วัน/เวลานัด">
        <strong style="color: var(--accent-color);">${formatThaiDate(item.date)}</strong>${todayBadge}<br>
        <small><i class="fa-regular fa-clock"></i> ${item.time} น.</small>
      </td>
      <td data-label="สาขา"><strong>${item.branch}</strong></td>
      <td data-label="ข้อมูลลูกค้า">
        <strong>${item.customerName}</strong><br>
        <small><i class="fa-solid fa-phone"></i> ${item.customerPhone}</small>
      </td>
      <td data-label="ข้อมูลรถยนต์">
        <strong>${item.carLicense}</strong><br>
        <small>${item.carModel}</small>
      </td>
      <td data-label="รายละเอียด"><p style="max-width: 250px; font-size: 0.85rem; color: var(--text-light); word-wrap: break-word;">${item.serviceDetails || '-'}</p></td>
      <td data-label="สถานะ"><span class="badge ${badgeClass}">${statusText}</span></td>
      <td data-label="จัดการ">
        <div class="action-btn-group">
          <button class="btn-icon btn-edit" onclick="openEditModal('${item.bookingId}')" title="แก้ไขคิว"><i class="fa-solid fa-pen-to-square"></i></button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// ค้นหาและกรองข้อมูลคิวฝั่ง Client-side
function filterBookings() {
  const searchQuery = document.getElementById("searchInput").value.toLowerCase();
  const selectedDate = document.getElementById("dateFilter") ? document.getElementById("dateFilter").value : "";
  const selectedBranch = document.getElementById("branchFilter").value;
  const selectedStatus = document.getElementById("statusFilter").value;
  const selectedSort = document.getElementById("sortFilter") ? document.getElementById("sortFilter").value : "nearest";

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  let filtered = bookingsList.filter(item => {
    const matchSearch = 
      item.customerName.toLowerCase().includes(searchQuery) ||
      item.customerPhone.includes(searchQuery) ||
      item.carLicense.toLowerCase().includes(searchQuery) ||
      item.bookingId.toLowerCase().includes(searchQuery);
    
    let matchDate = true;
    if (selectedDate === "upcoming" || selectedDate === "") {
      // ซ่อนวันที่ผ่านไปแล้ว (แสดงตั้งแต่วันนี้เป็นต้นไป)
      matchDate = item.date >= todayStr;
    } else if (selectedDate === "today") {
      matchDate = item.date === todayStr;
    } else if (selectedDate === "tomorrow") {
      matchDate = item.date === tomorrowStr;
    } else if (selectedDate === "all") {
      matchDate = true; // รวมประวัติย้อนหลังทั้งหมด
    }

    const matchBranch = selectedBranch === "" || item.branch === selectedBranch;
    
    let matchStatus = true;
    if (selectedStatus === "ปกติ") {
      matchStatus = !item.status.includes("ยกเลิก");
    } else if (selectedStatus === "ยกเลิก") {
      matchStatus = item.status.includes("ยกเลิก");
    }

    return matchSearch && matchDate && matchBranch && matchStatus;
  });

  // เรียงลำดับข้อมูล
  filtered.sort((a, b) => {
    if (selectedSort === "nearest") {
      // คิวใกล้ถึงก่อน: เรียงตามวันเวลานัดหมาย (น้อยไปมาก)
      const timeA = a.date + 'T' + (a.time.length === 5 ? a.time : a.time.substring(0, 5)) + ':00';
      const timeB = b.date + 'T' + (b.time.length === 5 ? b.time : b.time.substring(0, 5)) + ':00';
      return new Date(timeA) - new Date(timeB);
    } else {
      // ล่าสุดขึ้นก่อน: เรียงจากวันเวลาทำรายการ (มากไปน้อย)
      return new Date(b.timestamp) - new Date(a.timestamp);
    }
  });

  renderBookingsTable(filtered);
}

// เปิดโมดอล เพิ่มคิวใหม่
function openAddModal() {
  document.getElementById("modalTitle").innerText = "เพิ่มคิวบริการใหม่";
  document.getElementById("modalForm").reset();
  document.getElementById("modalBookingId").value = "";
  
  // ซ่อนช่องปรับสถานะในการแอดคิวใหม่ (ให้เป็น ปกติ เสมอ)
  document.getElementById("statusGroup").classList.add("hidden");
  
  document.getElementById("bookingModal").classList.add("active");
}

// เปิดโมดอล แก้ไขคิวเดิม
function openEditModal(bookingId) {
  const booking = bookingsList.find(item => item.bookingId === bookingId);
  if (!booking) return;

  document.getElementById("modalTitle").innerText = "แก้ไขข้อมูลคิว: " + bookingId;
  document.getElementById("modalBookingId").value = booking.bookingId;
  document.getElementById("modalBranch").value = booking.branch;
  document.getElementById("modalDate").value = booking.date;
  document.getElementById("modalTime").value = booking.time;
  document.getElementById("modalCustomerName").value = booking.customerName;
  document.getElementById("modalCustomerPhone").value = booking.customerPhone;
  document.getElementById("modalCarLicense").value = booking.carLicense;
  document.getElementById("modalCarModel").value = booking.carModel;
  document.getElementById("modalServiceDetails").value = booking.serviceDetails;
  
  // แสดงตัวเลือกเปลี่ยนสถานะ
  document.getElementById("statusGroup").classList.remove("hidden");
  document.getElementById("modalStatus").value = booking.status.includes("ยกเลิก") ? "ยกเลิก" : "ปกติ";

  document.getElementById("bookingModal").classList.add("active");
}

// ปิดหน้าต่างโมดอล
function closeModal() {
  document.getElementById("bookingModal").classList.remove("active");
}

// ส่งบันทึกข้อมูลจองคิว (ทั้ง Add ใหม่ และ Edit)
async function saveBooking(event) {
  event.preventDefault();

  const bookingId = document.getElementById("modalBookingId").value;
  const isEditMode = bookingId !== "";

  const btnSave = document.getElementById("btnModalSave");
  btnSave.disabled = true;
  btnSave.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกข้อมูล...`;

  const payload = {
    action: isEditMode ? "updateBooking" : "createBooking",
    bookingId: bookingId,
    branch: document.getElementById("modalBranch").value,
    date: document.getElementById("modalDate").value,
    time: document.getElementById("modalTime").value,
    customerName: document.getElementById("modalCustomerName").value,
    customerPhone: document.getElementById("modalCustomerPhone").value,
    carLicense: document.getElementById("modalCarLicense").value,
    carModel: document.getElementById("modalCarModel").value,
    serviceDetails: document.getElementById("modalServiceDetails").value,
    status: isEditMode ? document.getElementById("modalStatus").value : "ปกติ"
  };

  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    // เนื่องจากใช้โหมด 'no-cors' จะไม่สามารถอ่าน response body ได้โดยตรง 
    // เราจึงสุ่มดีเลย์สั้นๆ แล้วรีโหลดตารางขึ้นมาใหม่เพื่อยืนยันผลลัพธ์
    setTimeout(async () => {
      alert("🎉 บันทึกข้อมูลคิวเรียบร้อยแล้ว!");
      closeModal();
      await loadBookings();
      btnSave.disabled = false;
      btnSave.innerHTML = `บันทึกข้อมูล`;
    }, 1500);

  } catch (error) {
    console.error("Save error:", error);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
    btnSave.disabled = false;
    btnSave.innerHTML = `บันทึกข้อมูล`;
  }
}

// แปลงรูปแบบวันที่ไทย
function formatThaiDate(dateString) {
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('th-TH', options);
}

// ─── LINE Quota Tracker ────────────────────────────────
async function loadLineQuota() {
  const iconEl = document.getElementById('quotaRefreshIcon');
  const gridEl = document.getElementById('quotaGrid');

  if (iconEl) iconEl.classList.add('fa-spin');
  if (gridEl) gridEl.innerHTML = '<div class="quota-loading">กำลังโหลดข้อมูลโควตา...</div>';

  try {
    const res = await fetch(`${GAS_API_URL}?action=getLineQuota`);
    if (!res.ok) throw new Error('Network error');
    const result = await res.json();

    if (result.status !== 'success' || !result.quotas) {
      throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลโควตาได้');
    }

    const quotas = result.quotas;
    let html = '';

    for (const key in quotas) {
      const q = quotas[key];
      if (q.status === 'error') {
        html += `
          <div class="mini-quota-card warn">
            <div class="mini-quota-title"><span>💬 ${q.name || key}</span> ⚠️</div>
            <div class="mini-quota-meta" style="color:#f87171">ไม่สามารถดึงข้อมูลได้</div>
          </div>
        `;
        continue;
      }

      const used = q.totalUsage ?? 0;
      const limit = q.quotaLimit ?? 0;
      const isUnlimited = q.quotaType === 'none';
      const pct = (!isUnlimited && limit > 0) ? Math.min((used / limit) * 100, 100) : 0;
      const isWarn = !isUnlimited && pct >= 80;

      const limitText = isUnlimited ? '∞' : limit.toLocaleString();
      const pctText = isUnlimited ? 'ไม่จำกัด' : `${pct.toFixed(0)}%`;
      const remainingText = isUnlimited ? 'ไม่จำกัด' : `เหลือ ${(Math.max(limit - used, 0)).toLocaleString()} ข้อความ`;

      html += `
        <div class="mini-quota-card ${isWarn ? 'warn' : ''}">
          <div class="mini-quota-title">
            <span>💬 ${q.name}</span>
            <span style="font-size:0.75rem; color:${isWarn ? '#fbbf24' : '#9ca3af'}">${pctText}</span>
          </div>
          <div class="mini-quota-numbers">
            <span class="used">${used.toLocaleString()}</span>
            <span class="limit"> / ${limitText}</span>
          </div>
          <div class="mini-quota-bar-bg">
            <div class="mini-quota-bar-fill" style="width: ${isUnlimited ? 0 : pct.toFixed(1)}%"></div>
          </div>
          <div class="mini-quota-meta">
            ${isWarn ? '⚠️ ' : ''}${remainingText}
          </div>
        </div>
      `;
    }

    if (gridEl) gridEl.innerHTML = html || '<div class="quota-loading">ไม่พบข้อมูลโควตา</div>';

  } catch (err) {
    console.error('Quota fetch error:', err);
    if (gridEl) {
      gridEl.innerHTML = `<div class="quota-loading" style="color:#f87171">ไม่สามารถโหลดข้อมูลโควตาได้ (${err.message})</div>`;
    }
  } finally {
    if (iconEl) iconEl.classList.remove('fa-spin');
  }
}

// ─── Calendar View ─────────────────────────────────────
let calendarInstance = null;
let calendarInitialized = false;

// สลับมุมมองระหว่าง List, Calendar และ Analytics
function switchView(view) {
  const listContainer = document.getElementById('listViewContainer');
  const calContainer = document.getElementById('calendarViewContainer');
  const analyticsContainer = document.getElementById('analyticsViewContainer');
  const listToolbar = document.getElementById('listToolbar');

  const btnList = document.getElementById('btnTabList');
  const btnCal = document.getElementById('btnTabCalendar');
  const btnAnalytics = document.getElementById('btnTabAnalytics');

  if (btnList) btnList.classList.remove('active');
  if (btnCal) btnCal.classList.remove('active');
  if (btnAnalytics) btnAnalytics.classList.remove('active');

  if (listContainer) listContainer.classList.add('hidden');
  if (calContainer) calContainer.classList.add('hidden');
  if (analyticsContainer) analyticsContainer.classList.add('hidden');
  if (listToolbar) listToolbar.classList.add('hidden');

  if (view === 'list') {
    if (listContainer) listContainer.classList.remove('hidden');
    if (listToolbar) listToolbar.classList.remove('hidden');
    if (btnList) btnList.classList.add('active');
  } else if (view === 'calendar') {
    if (calContainer) calContainer.classList.remove('hidden');
    if (btnCal) btnCal.classList.add('active');

    if (!calendarInitialized) {
      initCalendar();
    } else {
      updateCalendarEvents();
    }
  } else if (view === 'analytics') {
    if (analyticsContainer) analyticsContainer.classList.remove('hidden');
    if (btnAnalytics) btnAnalytics.classList.add('active');

    if (!analyticsInitialized) {
      initAnalytics();
    } else {
      updateAnalytics();
    }
  }
}

// กำหนดสีตามสาขา
function getBranchColor(branch) {
  const colors = {
    'สาย 3':    { background: '#1a73e8', border: '#1558b0' },
    'บางแค':   { background: '#e67c00', border: '#bf6600' },
    'นนทบุรี': { background: '#0f9d58', border: '#0b7d46' },
    'หนองแขม': { background: '#7b1fa2', border: '#5c1579' },
  };
  return colors[branch] || { background: '#e11d29', border: '#b91c25' };
}

// แปลงข้อมูล bookings เป็น FullCalendar events (พร้อมตัวกรองสาขา)
function bookingsToEvents(data) {
  const calBranch = document.getElementById('calBranchFilter') ? document.getElementById('calBranchFilter').value : '';

  return data
    .filter(item => !item.status.includes('ยกเลิก'))
    .filter(item => calBranch === '' || item.branch === calBranch)
    .map(item => {
      const color = getBranchColor(item.branch);
      const dateTime = item.date + 'T' + (item.time.length === 5 ? item.time : item.time.substring(0, 5)) + ':00';
      // คำนวณเวลาสิ้นสุด +1 ชั่วโมง
      const start = new Date(dateTime);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      return {
        id: item.bookingId,
        title: `${item.time} | ${item.branch} | ${item.customerName}`,
        start: start.toISOString(),
        end: end.toISOString(),
        backgroundColor: color.background,
        borderColor: color.border,
        textColor: '#ffffff',
        extendedProps: { booking: item }
      };
    });
}

// สร้างปฏิทิน FullCalendar
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  const events = bookingsToEvents(bookingsList);

  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'th',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    buttonText: {
      today: 'วันนี้',
      month: 'เดือน',
      week: 'สัปดาห์',
      day: 'วัน',
      list: 'รายการ'
    },
    events: events,
    eventClick: function(info) {
      const booking = info.event.extendedProps.booking;
      // เปิดหน้าต่างแก้ไขโดยตรงเมื่อคลิก Event ในปฏิทิน
      openEditModal(booking.bookingId);
    },
    eventDidMount: function(info) {
      // แสดง Tooltip เมื่อชี้เมาส์
      const booking = info.event.extendedProps.booking;
      info.el.title = 
        `สาขา: ${booking.branch}\n` +
        `ลูกค้า: ${booking.customerName}\n` +
        `โทร: ${booking.customerPhone}\n` +
        `รถ: ${booking.carModel} (${booking.carLicense})\n` +
        `บริการ: ${booking.serviceDetails || '-'}`;
    },
    height: 'auto',
  });

  calendarInstance.render();
  calendarInitialized = true;
}

// อัปเดต events ในปฏิทินเมื่อข้อมูลเปลี่ยน
function updateCalendarEvents() {
  if (!calendarInstance) return;
  // ลบ events เก่าทั้งหมดออกก่อน
  calendarInstance.removeAllEvents();
  // เพิ่ม events ใหม่ทั้งหมดจากข้อมูลล่าสุด
  bookingsToEvents(bookingsList).forEach(ev => calendarInstance.addEvent(ev));
}

// ─── Data Analysis & Chart.js ──────────────────────────────
let analyticsInitialized = false;
let monthlyBranchChartInstance = null;
let branchShareChartInstance = null;
let timeSlotsChartInstance = null;

// เริ่มต้นส่วนวิเคราะห์ข้อมูล
function initAnalytics() {
  populateYearFilter();
  updateAnalytics();
  analyticsInitialized = true;
}

// เติมตัวเลือกปีลงใน Dropdown
function populateYearFilter() {
  const yearSelect = document.getElementById('analyticsYearFilter');
  if (!yearSelect) return;

  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear]);

  if (bookingsList && bookingsList.length > 0) {
    bookingsList.forEach(item => {
      if (item.date && item.date.length >= 4) {
        const y = parseInt(item.date.substring(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
  }

  const sortedYears = Array.from(years).sort((a, b) => b - a);
  yearSelect.innerHTML = sortedYears.map(y => `<option value="${y}">ปี ${y + 543} (${y})</option>`).join('');
}

// อัปเดตข้อมูลสถิติและการ์ด KPI ทั้งหมด
function updateAnalytics() {
  if (!bookingsList) return;

  const yearSelect = document.getElementById('analyticsYearFilter');
  const targetYear = yearSelect ? parseInt(yearSelect.value) || new Date().getFullYear() : new Date().getFullYear();

  const validBookings = bookingsList.filter(item => !item.status.includes('ยกเลิก'));

  // 1. คำนวณ KPI
  const now = new Date();
  const currentYearNum = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1; // 1-12
  const currentMonthStr = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;

  const prevMonthDate = new Date(currentYearNum, currentMonthNum - 2, 1);
  const prevYearNum = prevMonthDate.getFullYear();
  const prevMonthNum = prevMonthDate.getMonth() + 1;
  const prevMonthStr = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}`;

  // ยอดจองรวมทั้งหมด
  document.getElementById('kpiTotalBookings').textContent = validBookings.length.toLocaleString();

  // ยอดจองเดือนนี้ และ เดือนก่อน
  const thisMonthBookings = validBookings.filter(item => item.date && item.date.startsWith(currentMonthStr));
  const lastMonthBookings = validBookings.filter(item => item.date && item.date.startsWith(prevMonthStr));

  const thisMonthCount = thisMonthBookings.length;
  const lastMonthCount = lastMonthBookings.length;

  document.getElementById('kpiMonthBookings').textContent = thisMonthCount.toLocaleString();

  // MoM Growth %
  const momEl = document.getElementById('kpiMomGrowth');
  if (lastMonthCount === 0) {
    momEl.innerHTML = `<span style="color: #9ca3af">เทียบเดือนก่อน: N/A</span>`;
  } else {
    const growth = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
    if (growth > 0) {
      momEl.innerHTML = `<span style="color: #34d399; font-weight:600">▲ +${growth.toFixed(1)}% จากเดือนก่อน</span>`;
    } else if (growth < 0) {
      momEl.innerHTML = `<span style="color: #f87171; font-weight:600">▼ ${growth.toFixed(1)}% จากเดือนก่อน</span>`;
    } else {
      momEl.innerHTML = `<span style="color: #9ca3af">เท่ากับเดือนก่อน (0%)</span>`;
    }
  }

  // สาขาอันดับ 1 ในเดือนนี้
  const branchCountsThisMonth = {};
  thisMonthBookings.forEach(b => {
    branchCountsThisMonth[b.branch] = (branchCountsThisMonth[b.branch] || 0) + 1;
  });

  let topBranch = '--';
  let topBranchCount = 0;
  for (const br in branchCountsThisMonth) {
    if (branchCountsThisMonth[br] > topBranchCount) {
      topBranchCount = branchCountsThisMonth[br];
      topBranch = br;
    }
  }
  document.getElementById('kpiTopBranch').textContent = topBranch !== '--' ? `สาขา${topBranch}` : '--';
  document.getElementById('kpiTopBranchSub').textContent = topBranch !== '--' ? `${topBranchCount} คิวในเดือนนี้` : 'ไม่มีคิวเดือนนี้';

  // ช่วงเวลายอดฮิต
  const timeCounts = {};
  validBookings.forEach(b => {
    const t = b.time ? b.time.substring(0, 5) : '';
    if (t) timeCounts[t] = (timeCounts[t] || 0) + 1;
  });

  let peakTime = '--';
  let peakCount = 0;
  for (const t in timeCounts) {
    if (timeCounts[t] > peakCount) {
      peakCount = timeCounts[t];
      peakTime = t;
    }
  }
  document.getElementById('kpiPeakTime').textContent = peakTime !== '--' ? `${peakTime} น.` : '--';
  document.getElementById('kpiPeakTimeSub').textContent = peakTime !== '--' ? `${peakCount} คิวสะสม` : '--';

  // 2. คำนวณ Capacity Utilization Rate (%) ประจำสาขา
  renderUtilizationRate(thisMonthBookings, currentYearNum, currentMonthNum);

  // 3. กราฟ 1: สรุปยอดจองรายเดือน แยก 4 สาขา (4 สี)
  renderMonthlyBranchChart(validBookings, targetYear);

  // 4. กราฟ 2: สัดส่วนยอดจองแยกสาขา (Doughnut Chart)
  renderBranchShareChart(validBookings, targetYear);

  // 5. กราฟ 3: สถิติจองแยกตามรอบเวลา (12 รอบ)
  renderTimeSlotsChart(validBookings, targetYear);
}

// แสดงหลอดอัตราความหนาแน่นของคิว (Capacity Utilization Rate)
function renderUtilizationRate(thisMonthBookings, year, month) {
  const gridEl = document.getElementById('utilizationGrid');
  if (!gridEl) return;

  const daysInMonth = new Date(year, month, 0).getDate();
  const maxSlotsPerDay = 12;
  const maxMonthlyCapacity = daysInMonth * maxSlotsPerDay; // 12 * 30 = 360

  const branches = [
    { name: 'สาย 3', color: '#1a73e8' },
    { name: 'บางแค', color: '#e67c00' },
    { name: 'นนทบุรี', color: '#0f9d58' },
    { name: 'หนองแขม', color: '#7b1fa2' }
  ];

  const counts = {};
  thisMonthBookings.forEach(b => {
    counts[b.branch] = (counts[b.branch] || 0) + 1;
  });

  let html = '';
  branches.forEach(br => {
    const booked = counts[br.name] || 0;
    const pct = Math.min((booked / maxMonthlyCapacity) * 100, 100);

    html += `
      <div class="util-item">
        <div class="util-header">
          <span>📍 สาขา${br.name}</span>
          <span class="util-pct" style="color: ${br.color}">${pct.toFixed(1)}%</span>
        </div>
        <div class="util-bar-bg">
          <div class="util-bar-fill" style="width: ${pct.toFixed(1)}%; background: ${br.color}"></div>
        </div>
        <div style="font-size: 0.74rem; color: var(--gray); display:flex; justify-content:space-between; margin-top:2px;">
          <span>จองแล้ว ${booked} คิว</span>
          <span>เต็ม ${maxMonthlyCapacity} คิว</span>
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = html;
}

// กราฟ 1: แท่งรายเดือนแยก 4 สาขา (4 สี)
function renderMonthlyBranchChart(validBookings, targetYear) {
  const canvas = document.getElementById('monthlyBranchChart');
  if (!canvas) return;

  const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const branchData = {
    'สาย 3': new Array(12).fill(0),
    'บางแค': new Array(12).fill(0),
    'นนทบุรี': new Array(12).fill(0),
    'หนองแขม': new Array(12).fill(0)
  };

  validBookings.forEach(item => {
    if (!item.date || item.date.length < 7) return;
    const y = parseInt(item.date.substring(0, 4));
    const m = parseInt(item.date.substring(5, 7)) - 1; // 0-11

    if (y === targetYear && m >= 0 && m < 12 && branchData[item.branch]) {
      branchData[item.branch][m]++;
    }
  });

  const datasets = [
    { label: 'สาย 3', data: branchData['สาย 3'], backgroundColor: '#1a73e8', borderRadius: 4 },
    { label: 'บางแค', data: branchData['บางแค'], backgroundColor: '#e67c00', borderRadius: 4 },
    { label: 'นนทบุรี', data: branchData['นนทบุรี'], backgroundColor: '#0f9d58', borderRadius: 4 },
    { label: 'หนองแขม', data: branchData['หนองแขม'], backgroundColor: '#7b1fa2', borderRadius: 4 }
  ];

  if (monthlyBranchChartInstance) monthlyBranchChartInstance.destroy();

  monthlyBranchChartInstance = new Chart(canvas, {
    type: 'bar',
    data: { labels: monthLabels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#9ca3af', precision: 0 }, grid: { color: 'rgba(255,255,255,0.08)' } }
      }
    }
  });
}

// กราฟ 2: Doughnut Chart สัดส่วนแยกสาขา
function renderBranchShareChart(validBookings, targetYear) {
  const canvas = document.getElementById('branchShareChart');
  if (!canvas) return;

  const counts = { 'สาย 3': 0, 'บางแค': 0, 'นนทบุรี': 0, 'หนองแขม': 0 };

  validBookings.forEach(item => {
    if (!item.date || item.date.length < 4) return;
    const y = parseInt(item.date.substring(0, 4));
    if (y === targetYear && counts[item.branch] !== undefined) {
      counts[item.branch]++;
    }
  });

  const labels = Object.keys(counts);
  const dataValues = Object.values(counts);
  const bgColors = ['#1a73e8', '#e67c00', '#0f9d58', '#7b1fa2'];

  if (branchShareChartInstance) branchShareChartInstance.destroy();

  branchShareChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e2e8f0', font: { size: 12 } } }
      }
    }
  });
}

// กราฟ 3: แท่งสถิติจองแยก 12 รอบเวลา
function renderTimeSlotsChart(validBookings, targetYear) {
  const canvas = document.getElementById('timeSlotsChart');
  if (!canvas) return;

  const slots = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'];
  const slotCounts = new Array(12).fill(0);

  validBookings.forEach(item => {
    if (!item.date || item.date.length < 4) return;
    const y = parseInt(item.date.substring(0, 4));
    if (y === targetYear) {
      const t = item.time ? item.time.substring(0, 5) : '';
      const idx = slots.indexOf(t);
      if (idx !== -1) slotCounts[idx]++;
    }
  });

  if (timeSlotsChartInstance) timeSlotsChartInstance.destroy();

  timeSlotsChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: slots,
      datasets: [{
        label: 'จำนวนคิวจอง',
        data: slotCounts,
        backgroundColor: 'rgba(6, 185, 80, 0.7)',
        borderColor: '#06b950',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#9ca3af', precision: 0 }, grid: { color: 'rgba(255,255,255,0.08)' } }
      }
    }
  });
}
