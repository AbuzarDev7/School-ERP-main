// // server/src/middleware/upload.middleware.js
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

// // Ensure upload directory exists
// const uploadDir = 'uploads/students';
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
//   }
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
//   if (allowedTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
//   }
// };

// export const studentUpload = multer({ 
//   storage, 
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 } // 5MB total limit
// }).fields([
//   { name: 'photo', maxCount: 1 },
//   { name: 'birthCertificate', maxCount: 1 },
//   { name: 'fatherCnicFile', maxCount: 1 },
//   { name: 'leavingCertificate', maxCount: 1 }
// ]);



import multer from 'multer';

// Use memory storage so we can upload buffers directly to Supabase
const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

export const studentUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
    }
  }
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 },
  { name: 'fatherCnicFile', maxCount: 1 },
  { name: 'leavingCertificate', maxCount: 1 }
]);

// Single-image upload for staff profile photos. 1MB cap.
export const singleImageUpload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('image');