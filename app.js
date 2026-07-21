// 185Service Booking System - Client JavaScript

// ⚠️ ให้ผู้ใช้ก๊อปปี้ URL ของ Google Apps Script Web App ที่ Deploy เสร็จแล้วมาใส่ที่นี่
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzXkq_P31Exsqp4LCCLRwiRb2gPZgIG-g4aFlxgx_mGm_JHHCvzRfV06-up810e0APw/exec"; 

// กำหนดช่วงเวลาจอง (ทุกๆ 1 ชั่วโมง ตั้งแต่ 08:30 - 14:00)
const TIME_SLOTS = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"];

let selectedDateStr = "";
let selectedTimeStr = "";
let selectedBranchStr = "สาย 3";

// โหลดระบบหลังจากเอกสารโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  // เริ่มต้น Flatpickr ปฏิทินภาษาไทย
  flatpickr("#bookingDate", {
    locale: "th",
    dateFormat: "Y-m-d",
    minDate: "today", // ห้ามจองย้อนหลัง
    disable: [
      function(date) {
        // สามารถปิดวันอาทิตย์ได้ที่นี่ถ้าต้องการ (0 คือวันอาทิตย์)
        // return (date.getDay() === 0);
        return false;
      }
    ],
    onChange: function(selectedDates, dateStr) {
      selectedDateStr = dateStr;
      document.getElementById("selectDateWarning").classList.add("hidden");
      checkAvailableSlots();
    }
  });

  // ผูก Event Listener ให้กับปุ่มเปลี่ยนสาขา
  const branchRadios = document.querySelectorAll('input[name="branch"]');
  branchRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedBranchStr = e.target.value;
      if (selectedDateStr) {
        checkAvailableSlots();
      }
    });
  });
});

// ฟังก์ชันดึงจำนวนคิวจองจาก Google Sheets ผ่าน GAS Web App
async function checkAvailableSlots() {
  const timeGrid = document.getElementById("timeGrid");
  const loadingEl = document.getElementById("timeSlotsLoading");
  const errorEl = document.getElementById("timeSlotsError");
  const btnNext = document.getElementById("btnNextStep1");

  timeGrid.classList.add("hidden");
  errorEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  btnNext.disabled = true;

  // ตรวจสอบว่าใส่ URL ของ GAS หรือยัง
  if (!GAS_API_URL || GAS_API_URL === "YOUR_GAS_WEB_APP_URL") {
    console.warn("ยังไม่ได้ตั้งค่า GAS_API_URL - จำลองข้อมูลตัวอย่างคิวว่าง");
    setTimeout(() => {
      // จำลองข้อมูลคิวว่างกรณีที่ยังไม่ได้เอา URL GAS มาใส่
      const mockQueues = { "08:30": 2, "09:00": 0, "09:30": 0, "10:00": 1, "10:30": 1, "11:00": 0, "11:30": 3, "12:00": 0, "12:30": 0, "13:00": 0, "13:30": 1, "14:00": 0 };
      renderTimeSlots(mockQueues);
    }, 800);
    return;
  }

  try {
    const url = `${GAS_API_URL}?action=checkQueues&date=${selectedDateStr}&branch=${encodeURIComponent(selectedBranchStr)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("API Network response was not ok");
    
    const result = await response.json();
    if (result.status === "success") {
      renderTimeSlots(result.data);
    } else {
      throw new Error(result.message || "Unknown error");
    }
  } catch (error) {
    console.error("Error fetching queue slots:", error);
    loadingEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
  }
}

// เรนเดอร์การเลือกช่วงเวลาลงบนหน้าเว็บ
function renderTimeSlots(queueData) {
  const timeGrid = document.getElementById("timeGrid");
  const loadingEl = document.getElementById("timeSlotsLoading");
  
  timeGrid.innerHTML = "";
  loadingEl.classList.add("hidden");
  timeGrid.classList.remove("hidden");

  TIME_SLOTS.forEach(time => {
    // นับจำนวนคิวที่ถูกจองไปแล้ว
    const queueCount = queueData[time] || 0;
    
    // สร้าง Element ช่วงเวลา
    const timeLabel = document.createElement("label");
    timeLabel.className = "time-slot";
    
    const isFull = queueCount >= 3; // กำหนดว่าคิวเต็มที่ 3 คิวต่อรอบเวลาต่อสาขา (สามารถเปลี่ยนจำนวนได้)
    if (isFull) {
      timeLabel.classList.add("full");
    }

    timeLabel.innerHTML = `
      <input type="radio" name="bookingTime" value="${time}" required ${isFull ? 'disabled' : ''}>
      <div class="time-slot-content">
        <span class="time-title">${time} น.</span>
        <span class="time-status">${isFull ? 'คิวเต็มแล้ว' : `จองแล้ว ${queueCount} คิว`}</span>
      </div>
    `;

    // ผูก Event Listener เมื่อผู้ใช้เลือกเวลา
    const radioInput = timeLabel.querySelector('input[name="bookingTime"]');
    if (!isFull) {
      radioInput.addEventListener('change', (e) => {
        selectedTimeStr = e.target.value;
        document.getElementById("btnNextStep1").disabled = false; // ปลดล็อคปุ่มไปขั้นตอนถัดไป
      });
    }

    timeGrid.appendChild(timeLabel);
  });
}

// ควบคุมการเปลี่ยนหน้า (Step)
function goToStep(step) {
  // ซ่อนทุกขั้นตอน
  document.querySelectorAll(".form-step").forEach(stepEl => {
    stepEl.classList.remove("active");
  });
  // นำ Active ออกจาก Step Indicator ทุกตัว
  document.querySelectorAll(".step-item").forEach(indicator => {
    indicator.classList.remove("active");
  });

  // แสดงขั้นตอนที่เลือก
  document.getElementById(`step${step}`).classList.add("active");
  
  // ไฮไลต์ Step Indicator
  for (let i = 1; i <= step; i++) {
    const indicator = document.getElementById(`step${i}-indicator`);
    if (indicator) indicator.classList.add("active");
  }
}

// ฟังก์ชันกดส่งข้อมูลจอง
async function handleFormSubmit(event) {
  event.preventDefault();

  const btnSubmit = document.getElementById("btnSubmit");
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึกข้อมูลจอง...`;

  const formData = {
    action: "createBooking",
    branch: selectedBranchStr,
    date: selectedDateStr,
    time: selectedTimeStr,
    customerName: document.getElementById("customerName").value,
    customerPhone: document.getElementById("customerPhone").value,
    carLicense: document.getElementById("carLicense").value,
    carModel: document.getElementById("carModel").value,
    serviceDetails: document.getElementById("serviceDetails").value
  };

  // แสดงสรุปผลหน้าสุดท้าย
  document.getElementById("sumBranch").innerText = formData.branch;
  document.getElementById("sumDateTime").innerText = `${formatThaiDate(formData.date)} เวลา ${formData.time} น.`;
  document.getElementById("sumName").innerText = formData.customerName;
  document.getElementById("sumCar").innerText = `${formData.carLicense} (${formData.carModel})`;

  // หากไม่มีการระบุ URL ให้จำลองการจองสำเร็จทันที
  if (!GAS_API_URL || GAS_API_URL === "YOUR_GAS_WEB_APP_URL") {
    setTimeout(() => {
      goToStep(3);
    }, 1500);
    return;
  }

  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      mode: "no-cors", // ใช้ no-cors เนื่องจากเป็นการส่งข้ามโดเมนไปยัง Google Apps Script
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    // เนื่องจากใช้โหมด 'no-cors' จะไม่สามารถอ่าน response body ได้ แต่ถ้าส่งไปสำเร็จจะไม่มี Error
    // ดังนั้นเราจึงถือว่าการทำงานสำเร็จและพาผู้ใช้งานไปที่หน้าสำเร็จ
    goToStep(3);

  } catch (error) {
    console.error("Booking submission error:", error);
    alert("เกิดข้อผิดพลาดในการส่งข้อมูลการจอง กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ");
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `ยืนยันการจองคิวรถ <i class="fa-solid fa-circle-check"></i>`;
  }
}

// รีเซ็ตฟอร์มจองคิวเพื่อทำการจองใหม่
function resetForm() {
  document.getElementById("bookingForm").reset();
  selectedDateStr = "";
  selectedTimeStr = "";
  selectedBranchStr = "สาย 3";
  
  // เลือกสาขาสาย 3 ให้เป็นค่าเริ่มต้น
  document.querySelector('input[name="branch"][value="สาย 3"]').checked = true;
  
  // รีเซ็ตหน้าแสดงเวลา
  document.getElementById("timeGrid").classList.add("hidden");
  document.getElementById("selectDateWarning").classList.remove("hidden");
  document.getElementById("btnNextStep1").disabled = true;

  goToStep(1);
}

// แปลงรูปแบบวันที่เป็นภาษาไทย
function formatThaiDate(dateString) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', options);
}
