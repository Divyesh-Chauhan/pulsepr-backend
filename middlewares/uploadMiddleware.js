import multer from 'multer';

// Use memory storage — files are held in RAM buffer and sent to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
    },
});

// For product image uploads (admin) — up to 10 images
export const uploadProductImages = upload.array('images', 10);

// For user design uploads — single file
export const uploadDesignImage = upload.single('design');
