/**
 * 185Service x Bridgestone Promotion System - Frontend JS
 * บันทึกข้อมูลลูกค้าเปลี่ยนสายน้ำยาแอร์ Bridgestone รับบัตร Gift Card Lotus's 100.-
 */

// ⚠️ วาง URL ของ Google Apps Script (Web App) ของ Google Sheet โปรโมชั่นที่นี่
const GAS_PROMO_API_URL = "https://script.google.com/macros/s/AKfycbzPe9bKgQKu5_qd4x4zRwDDm_ocA0lBs0ituwYe43DgFA4Hl1eJEK2BD9a9mN3euP07pQ/exec";

// หน่วยความจำในเครื่อง
let localRecords = [];

document.addEventListener("DOMContentLoaded", () => {
  // 1. กำหนดวันที่เริ่มต้นเป็นวันนี้ (YYYY-MM-DD)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateInput = document.getElementById("entryDate");
  if (dateInput) {
    dateInput.value = `${year}-${month}-${day}`;
  }

  // 2. คืนค่าสาขาที่เคยเลือกไว้จาก LocalStorage
  loadSavedBranch();

  // 3. โหลดรายการและสถิติ
  loadRecentRecords();
});

// บันทึกสาขาจำลงใน LocalStorage ของเครื่อง
function saveBranchPreference(branchName) {
  try {
    localStorage.setItem("185_promo_branch", branchName);
  } catch (e) {
    console.warn("Cannot save branch to localStorage", e);
  }
}

// โหลดสาขาที่เคยเลือกไว้
function loadSavedBranch() {
  try {
    const savedBranch = localStorage.getItem("185_promo_branch");
    if (savedBranch) {
      const radio = document.querySelector(`input[name="branch"][value="${savedBranch}"]`);
      if (radio) {
        radio.checked = true;
      }
    }
  } catch (e) {
    console.warn("Cannot load branch from localStorage", e);
  }
}

// ปุ่ม Quick Price Chips
function setProductPrice(price) {
  const priceInput = document.getElementById("productValue");
  if (priceInput) {
    priceInput.value = price;
    priceInput.focus();
  }
}

// ส่งฟอร์มบันทึกข้อมูล
async function handleSubmit(event) {
  event.preventDefault();

  const btnSubmit = document.getElementById("btnSubmit");
  const msgBanner = document.getElementById("msgBanner");
  const msgText = document.getElementById("msgText");

  // ดึงค่าจากฟอร์ม
  const branchEl = document.querySelector('input[name="branch"]:checked');
  const branch = branchEl ? branchEl.value : "สาย 3";
  const date = document.getElementById("entryDate").value;
  const customerName = document.getElementById("customerName").value.trim();
  const customerPhone = document.getElementById("customerPhone").value.trim();
  const productValue = parseFloat(document.getElementById("productValue").value) || 0;
  const notes = document.getElementById("notes").value.trim();

  if (!customerName || !customerPhone || !date) {
    showBannerMsg("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", false);
    return;
  }

  // ล็อคปุ่มขณะส่งข้อมูล
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังบันทึกลง Google Sheet...';
  hideBannerMsg();

  const payload = {
    action: "recordPromo",
    branch: branch,
    date: date,
    customerName: customerName,
    customerPhone: customerPhone,
    productValue: productValue,
    notes: notes,
    timestamp: new Date().toISOString()
  };

  // ตรวจสอบว่าใส่ URL ของ GAS หรือยัง
  if (!GAS_PROMO_API_URL || GAS_PROMO_API_URL === "YOUR_GAS_PROMO_WEB_APP_URL") {
    // โหมดจำลอง Mock เมื่อยังไม่ได้เชื่อม GAS URL
    setTimeout(() => {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลแจก Gift Card';

      // จำลองเพิ่มลงใน Local Array
      localRecords.unshift({
        no: localRecords.length + 1,
        branch: branch,
        date: date,
        name: customerName,
        phone: customerPhone,
        value: productValue,
        notes: notes,
        timestamp: new Date().toLocaleTimeString('th-TH')
      });

      showSuccessModal(customerName, branch, productValue);
      renderRecordsList(localRecords);
      updateCounts(localRecords);
    }, 600);
    return;
  }

  // ส่งข้อมูลจริงไปยัง Google Apps Script
  try {
    const response = await fetch(GAS_PROMO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลแจก Gift Card';

    if (result.status === "success") {
      showSuccessModal(customerName, branch, productValue);
      loadRecentRecords();
    } else {
      throw new Error(result.message || "เกิดข้อผิดพลาดในการบันทึก");
    }

  } catch (error) {
    console.error("Submission error:", error);
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลแจก Gift Card';
    showBannerMsg(`บันทึกไม่สำเร็จ: ${error.message} (กรุณาลองใหม่อีกครั้ง)`, false);
  }
}

// โหลดรายการและสถิติจาก Google Sheet
async function loadRecentRecords() {
  const refreshIcon = document.getElementById("refreshIcon");
  if (refreshIcon) refreshIcon.classList.add("fa-spin");

  const listEl = document.getElementById("recentList");

  if (!GAS_PROMO_API_URL || GAS_PROMO_API_URL === "YOUR_GAS_PROMO_WEB_APP_URL") {
    setTimeout(() => {
      if (refreshIcon) refreshIcon.classList.remove("fa-spin");
      if (localRecords.length === 0) {
        // ตัวอย่าง Mock
        localRecords = [
          { no: 1, branch: "สาย 3", date: getTodayStr(), name: "คุณสมชาย ตัวอย่าง", phone: "0891234567", value: 1200, notes: "กข 1234" }
        ];
      }
      renderRecordsList(localRecords);
      updateCounts(localRecords);
    }, 400);
    return;
  }

  try {
    const response = await fetch(`${GAS_PROMO_API_URL}?action=getRecentRecords`);
    const result = await response.json();

    if (result.status === "success") {
      renderRecordsList(result.data || []);
      updateCounts(result.data || []);
    } else {
      listEl.innerHTML = `<div class="empty-state" style="color: #f87171">ไม่สามารถโหลดข้อมูลได้</div>`;
    }
  } catch (err) {
    console.error("Fetch error:", err);
    listEl.innerHTML = `<div class="empty-state">ยังไม่มีรายการล่าสุด หรือโหลดข้อมูลไม่สำเร็จ</div>`;
  } finally {
    if (refreshIcon) refreshIcon.classList.remove("fa-spin");
  }
}

// แสดงรายการลงใน Drawer
function renderRecordsList(records) {
  const listEl = document.getElementById("recentList");
  if (!listEl) return;

  if (!records || records.length === 0) {
    listEl.innerHTML = `<div class="empty-state">ยังไม่มีการบันทึกรายการแจก Gift Card</div>`;
    return;
  }

  // แสดง 10 รายการล่าสุด
  const displayItems = records.slice(0, 15);
  let html = "";

  displayItems.forEach((item, idx) => {
    const formattedPrice = Number(item.value || item.productValue || 0).toLocaleString();
    const branchName = item.branch || "สาย 3";
    const dateStr = item.date || "--";
    const rawName = item.name || item.customerName || "";
    const rawPhone = item.phone || item.customerPhone || "";
    const name = maskName(rawName);
    const phone = maskPhone(rawPhone);
    const notes = item.notes ? `(${item.notes})` : "";

    html += `
      <div class="recent-item">
        <div class="recent-item-left">
          <span class="recent-item-name">${name} ${notes}</span>
          <span class="recent-item-sub">
            <span><i class="fa-solid fa-shop"></i> ${branchName}</span>
            <span><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
            ${phone ? `<span><i class="fa-solid fa-phone"></i> ${phone}</span>` : ""}
          </span>
        </div>
        <div class="recent-item-price">
          ฿${formattedPrice}
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

// ฟังก์ชันเซนเซอร์ชื่อลูกค้า (Mask Name) เพื่อความปลอดภัย
function maskName(name) {
  if (!name || typeof name !== 'string') return "ไม่ระบุชื่อ";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  
  if (parts.length >= 2) {
    // ถ้ามีชื่อและนามสกุล: แสดงชื่อจริง และเซนเซอร์นามสกุล เช่น "สมชาย ใ***"
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    const maskedLastName = lastName.length > 1 ? lastName.substring(0, 1) + "***" : "***";
    return `${firstName} ${maskedLastName}`;
  } else {
    // ถ้ามีคำเดียว: เซนเซอร์ครึ่งหลัง เช่น "สมช***"
    if (trimmed.length <= 3) return trimmed.substring(0, 1) + "***";
    return trimmed.substring(0, 3) + "***";
  }
}

// ฟังก์ชันเซนเซอร์เบอร์โทรศัพท์ (Mask Phone) เช่น 089-XXX-4567
function maskPhone(phone) {
  if (!phone) return "";
  const clean = phone.toString().replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return clean.substring(0, 3) + "-XXX-" + clean.substring(6);
  } else if (clean.length === 9) {
    return clean.substring(0, 2) + "-XXX-" + clean.substring(5);
  } else if (clean.length > 4) {
    return clean.substring(0, 3) + "***" + clean.substring(clean.length - 2);
  }
  return phone;
}

// อัปเดตตัวเลขนับสถิติ
function updateCounts(records) {
  if (!records) return;
  const todayStr = getTodayStr();
  
  const todayRecords = records.filter(r => (r.date || "").includes(todayStr));
  
  const todayCountEl = document.getElementById("todayCount");
  const totalCountEl = document.getElementById("totalCount");

  if (todayCountEl) todayCountEl.innerText = todayRecords.length.toLocaleString();
  if (totalCountEl) totalCountEl.innerText = records.length.toLocaleString();
}

// แสดง Modal แจ้งเตือนสำเร็จ
function showSuccessModal(custName, branch, price) {
  document.getElementById("mCust").innerText = custName;
  document.getElementById("mBranch").innerText = `สาขา${branch}`;
  document.getElementById("mPrice").innerText = `${Number(price).toLocaleString()} บาท`;

  const modal = document.getElementById("successModal");
  if (modal) modal.classList.add("active");
}

// ปิด Modal และรีเซ็ตฟอร์มสำหรับบันทึกรายการถัดไป
function closeModalAndReset() {
  const modal = document.getElementById("successModal");
  if (modal) modal.classList.remove("active");

  // รีเซ็ตช่องกรอก
  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("productValue").value = "";
  document.getElementById("notes").value = "";

  // โฟกัสไปที่ช่องชื่อทันที
  document.getElementById("customerName").focus();
}

// ข้อความแจ้งเตือน Banner
function showBannerMsg(text, isSuccess = true) {
  const banner = document.getElementById("msgBanner");
  const msgText = document.getElementById("msgText");
  if (!banner || !msgText) return;

  msgText.innerText = text;
  banner.className = `msg-banner ${isSuccess ? 'success' : 'error'}`;
  banner.style.display = "flex";
}

function hideBannerMsg() {
  const banner = document.getElementById("msgBanner");
  if (banner) banner.style.display = "none";
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
