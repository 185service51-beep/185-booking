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
      renderBookingsTable(bookingsList);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ไม่สามารถเชื่อมต่อระบบหลังบ้านได้ (${error.message})</td></tr>`;
  }
}

// เรนเดอร์ตารางข้อมูล
function renderBookingsTable(data) {
  const tableBody = document.getElementById("bookingsTableBody");
  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-light);">ไม่มีข้อมูลการจองคิวรถในระบบ</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement("tr");
    
    // ตั้งรูปแบบสถานะ Badge
    let badgeClass = "badge-success";
    let statusText = "ปกติ";
    if (item.status === "ยกเลิก" || item.status === "ยกเลิกคิว" || item.status.includes("ยกเลิก")) {
      badgeClass = "badge-danger";
      statusText = "ยกเลิกแล้ว";
    }

    tr.innerHTML = `
      <td>
        <strong style="color: var(--accent-color);">${formatThaiDate(item.date)}</strong><br>
        <small><i class="fa-regular fa-clock"></i> ${item.time} น.</small>
      </td>
      <td><strong>${item.branch}</strong></td>
      <td>
        <strong>${item.customerName}</strong><br>
        <small><i class="fa-solid fa-phone"></i> ${item.customerPhone}</small>
      </td>
      <td>
        <strong>${item.carLicense}</strong><br>
        <small>${item.carModel}</small>
      </td>
      <td><p style="max-width: 250px; font-size: 0.85rem; color: var(--text-light); word-wrap: break-word;">${item.serviceDetails || '-'}</p></td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td>
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
  const selectedBranch = document.getElementById("branchFilter").value;
  const selectedStatus = document.getElementById("statusFilter").value;

  const filtered = bookingsList.filter(item => {
    const matchSearch = 
      item.customerName.toLowerCase().includes(searchQuery) ||
      item.customerPhone.includes(searchQuery) ||
      item.carLicense.toLowerCase().includes(searchQuery) ||
      item.bookingId.toLowerCase().includes(searchQuery);
    
    const matchBranch = selectedBranch === "" || item.branch === selectedBranch;
    
    let matchStatus = true;
    if (selectedStatus === "ปกติ") {
      matchStatus = !item.status.includes("ยกเลิก");
    } else if (selectedStatus === "ยกเลิก") {
      matchStatus = item.status.includes("ยกเลิก");
    }

    return matchSearch && matchBranch && matchStatus;
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

// ─── Calendar View ─────────────────────────────────────
let calendarInstance = null;
let calendarInitialized = false;

// สลับมุมมองระหว่าง List และ Calendar
function switchView(view) {
  const listContainer = document.getElementById('listViewContainer');
  const calContainer = document.getElementById('calendarViewContainer');
  const listToolbar = document.getElementById('listToolbar');
  const btnList = document.getElementById('btnTabList');
  const btnCal = document.getElementById('btnTabCalendar');

  if (view === 'list') {
    listContainer.classList.remove('hidden');
    calContainer.classList.add('hidden');
    listToolbar.classList.remove('hidden');
    btnList.classList.add('active');
    btnCal.classList.remove('active');
  } else {
    listContainer.classList.add('hidden');
    calContainer.classList.remove('hidden');
    listToolbar.classList.add('hidden');
    btnList.classList.remove('active');
    btnCal.classList.add('active');

    // สร้างปฏิทินครั้งแรกเมื่อสลับมุมมอง
    if (!calendarInitialized) {
      initCalendar();
    } else {
      // อัปเดตกิจกรรมในปฏิทินจากข้อมูลล่าสุด
      updateCalendarEvents();
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

// แปลงข้อมูล bookings เป็น FullCalendar events
function bookingsToEvents(data) {
  return data
    .filter(item => !item.status.includes('ยกเลิก'))
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
