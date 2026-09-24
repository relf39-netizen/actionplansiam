import React, { useState } from 'react';
import { School, FiscalYear } from '../types';
import { Building2, Save, Check, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

interface SchoolInfoViewProps {
  school: School;
  activeFiscalYear: FiscalYear;
  onUpdateSchool: (updated: School) => void;
}

export const SchoolInfoView: React.FC<SchoolInfoViewProps> = ({
  school,
  activeFiscalYear,
  onUpdateSchool,
}) => {
  const [formData, setFormData] = useState<School>({ ...school });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'fiscalYear' ? Number(value) : value,
    }));
  };

  // Handle Logo File Upload (reads local image and converts to base64 Data URL)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setUploadError('ขนาดไฟล์รูปภาพไม่ควรเกิน 3 MB');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({
          ...prev,
          logoUrl: dataUrl,
        }));
      }
    };
    reader.onerror = () => {
      setUploadError('ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleSetExampleLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchool(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-700" />
            <span>ข้อมูลพื้นฐานและตราสัญลักษณ์สถานศึกษา</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดข้อมูลสถานศึกษาและตั้งค่าโลโก้สำหรับหัวรายงาน แผนปฏิบัติการประจำปี และเอกสารราชการ
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-xs">
            <Check className="h-4 w-4" />
            <span>บันทึกข้อมูลและโลโก้โรงเรียนเรียบร้อยแล้ว</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Logo Configuration Card */}
        <div className="p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-xl border border-blue-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              <span>การตั้งค่าตราสัญลักษณ์ / โลโก้ประจำโรงเรียน (School Logo)</span>
            </h3>
            <span className="text-[11px] text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full font-medium">
              สิทธิ์สำหรับผู้ดูแลระบบ (Admin)
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
            {/* Logo Preview */}
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl bg-white border-2 border-blue-200 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="School Logo"
                    className="h-full w-full object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-slate-400" />
                )}
              </div>
              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  title="ลบโลโก้"
                  className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-md hover:bg-red-700 transition-colors"
                >
                  <span className="text-[10px] font-bold px-1">✕</span>
                </button>
              )}
            </div>

            {/* Logo Controls */}
            <div className="flex-1 space-y-2.5 w-full">
              <div className="flex flex-wrap items-center gap-2">
                {/* File Upload Button */}
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  <span>อัปโหลดรูปภาพโลโก้จากเครื่อง</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Preset Button */}
                <button
                  type="button"
                  onClick={handleSetExampleLogo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                >
                  <span>ใช้ตราสัญลักษณ์ตัวอย่าง</span>
                </button>

                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span>ล้างรูปภาพ</span>
                  </button>
                )}
              </div>

              {/* URL Alternative */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">หรือระบุ URL รูปภาพ:</span>
                <input
                  id="school-logo-url-input"
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png หรือ data:image/..."
                  className="flex-1 text-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 font-medium">{uploadError}</p>
              )}
              <p className="text-[11px] text-slate-500">
                รองรับไฟล์ PNG, JPG, WebP และ SVG แนะนำรูปภาพทรงสี่เหลี่ยมจัตุรัส ขนาดไม่เกิน 2MB
              </p>
            </div>
          </div>
        </div>

        {/* Grid Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อโรงเรียน <span className="text-red-500">*</span>
            </label>
            <input
              id="input-school-name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="เช่น โรงเรียนเด็กเรียนดี"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสโรงเรียน (10 หลัก) <span className="text-red-500">*</span>
            </label>
            <input
              id="input-school-code"
              type="text"
              name="schoolCode"
              required
              value={formData.schoolCode}
              onChange={handleChange}
              placeholder="เช่น 1000000001"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              สังกัดหน่วยงาน <span className="text-red-500">*</span>
            </label>
            <input
              id="input-school-affiliation"
              type="text"
              name="affiliation"
              required
              value={formData.affiliation}
              onChange={handleChange}
              placeholder="เช่น สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน (สพฐ.)"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              สำนักงานเขตพื้นที่การศึกษา <span className="text-red-500">*</span>
            </label>
            <input
              id="input-school-education-area"
              type="text"
              name="educationArea"
              required
              value={formData.educationArea}
              onChange={handleChange}
              placeholder="เช่น สำนักงานเขตพื้นที่การศึกษาประถมศึกษาตัวอย่าง เขต 1"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ผู้อำนวยการโรงเรียน <span className="text-red-500">*</span>
            </label>
            <input
              id="input-school-director"
              type="text"
              name="directorName"
              required
              value={formData.directorName}
              onChange={handleChange}
              placeholder="เช่น นายตัวอย่าง ผู้นำการศึกษา (ผู้อำนวยการโรงเรียน)"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ปีงบประมาณ พ.ศ. ปัจจุบัน
            </label>
            <input
              id="input-school-fiscal-year"
              type="number"
              name="fiscalYear"
              value={formData.fiscalYear}
              onChange={handleChange}
              placeholder="2568"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เบอร์โทรศัพท์ติดต่อ
            </label>
            <input
              id="input-school-phone"
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="เช่น 02-000-0000 หรือ 081-000-0000"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ที่อยู่ / หมู่บ้าน / ถนน
            </label>
            <input
              id="input-school-address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="เช่น เลขที่ 99 หมู่ที่ 1 ถนนตัวอย่าง"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ตำบล / แขวง
            </label>
            <input
              id="input-school-subdistrict"
              type="text"
              name="subdistrict"
              value={formData.subdistrict}
              onChange={handleChange}
              placeholder="เช่น ตำบลตัวอย่าง"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              อำเภอ / เขต
            </label>
            <input
              id="input-school-district"
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="เช่น อำเภอตัวอย่าง"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              จังหวัด
            </label>
            <input
              id="input-school-province"
              type="text"
              name="province"
              value={formData.province}
              onChange={handleChange}
              placeholder="เช่น จังหวัดตัวอย่าง"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสไปรษณีย์
            </label>
            <input
              id="input-school-zipcode"
              type="text"
              name="zipcode"
              value={formData.zipcode}
              onChange={handleChange}
              placeholder="เช่น 10000"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email ประจำโรงเรียน
            </label>
            <input
              id="input-school-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="เช่น dekreeandee_school@obec.mail.go.th"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            id="btn-reset-school-info"
            type="button"
            onClick={() => setFormData({ ...school })}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>คืนค่าเดิม</span>
          </button>

          <button
            id="btn-save-school-info"
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>บันทึกข้อมูลและตราสัญลักษณ์</span>
          </button>
        </div>
      </form>
    </div>
  );
};
