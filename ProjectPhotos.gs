/** Standalone Google Apps Script Web App for project activity photos.
 * Script Properties: ROOT_FOLDER_ID and BRIDGE_SECRET.
 * Deploy as Web App: execute as owner, access: anyone with the URL.
 * Keep BRIDGE_SECRET only on the PHP server.
 */
function config_() {
  const props = PropertiesService.getScriptProperties();
  const root = props.getProperty('ROOT_FOLDER_ID');
  const secret = props.getProperty('BRIDGE_SECRET');
  if (!root || !secret) throw new Error('ตั้ง ROOT_FOLDER_ID และ BRIDGE_SECRET ก่อน');
  return { root: DriveApp.getFolderById(root), secret };
}
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function namedFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}
function projectFolder_(root, schoolId, fiscalYearId, projectId) {
  if (!/^\d+$/.test(String(schoolId)) || !/^\d+$/.test(String(fiscalYearId)) || !/^\d+$/.test(String(projectId))) throw new Error('รหัสโครงการไม่ถูกต้อง');
  return namedFolder_(namedFolder_(namedFolder_(root, 'school-' + schoolId), 'fiscal-' + fiscalYearId), 'project-' + projectId);
}
function belongs_(file, folder) {
  const parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folder.getId()) return true;
  return false;
}
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const config = config_();
    if (request.secret !== config.secret) throw new Error('ไม่ได้รับอนุญาต');
    if (request.action === 'ping') return json_({ success: true, folderId: config.root.getId(), folderName: config.root.getName() });
    const folder = projectFolder_(config.root, request.schoolId, request.fiscalYearId, request.projectId);
    if (request.action === 'delete') {
      const file = DriveApp.getFileById(request.fileId);
      if (!belongs_(file, folder)) throw new Error('รูปไม่อยู่ในโครงการนี้');
      file.setTrashed(true);
      return json_({ success: true });
    }
    if (request.action !== 'upload' || !/^data:image\/jpeg;base64,/.test(request.dataUrl || '')) throw new Error('รับเฉพาะภาพ JPEG');
    const binary = Utilities.base64Decode(request.dataUrl.split(',')[1]);
    if (binary.length > 450000) throw new Error('ภาพใหญ่เกิน 450 KB');
    const file = folder.createFile(Utilities.newBlob(binary, 'image/jpeg', 'activity-' + Date.now() + '-' + Utilities.getUuid() + '.jpg'));
    return json_({ success: true, fileId: file.getId() });
  } catch (error) { return json_({ success: false, message: String(error) }); }
}
function doGet(e) {
  try {
    const request = e.parameter;
    const config = config_();
    if (request.secret !== config.secret) throw new Error('ไม่ได้รับอนุญาต');
    const folder = projectFolder_(config.root, request.schoolId, request.fiscalYearId, request.projectId);
    const file = DriveApp.getFileById(request.fileId);
    if (!belongs_(file, folder) || file.isTrashed()) throw new Error('ไม่พบรูปในโครงการนี้');
    return json_({ success: true, dataUrl: 'data:image/jpeg;base64,' + Utilities.base64Encode(file.getBlob().getBytes()) });
  } catch (error) { return json_({ success: false, message: String(error) }); }
}
