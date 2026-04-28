// Função global de upload de arquivos
async function uploadFile(file, folder) {
    if (!file) {
        console.error("Nenhum arquivo fornecido");
        return null;
    }
    
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.");
    }
    
    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new Error("Arquivo muito grande. Máximo permitido: 5MB");
    }
    
    try {
        const storageRef = firebase.storage().ref();
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileRef = storageRef.child(`${folder}/${timestamp}_${safeFileName}`);
        
        // Upload com monitoramento de progresso
        const uploadTask = fileRef.put(file);
        
        // Retornar Promise que resolve com a URL
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progresso do upload
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload: ${Math.round(progress)}%`);
                    
                    // Atualizar status na tela se existir o elemento
                    const uploadStatus = document.getElementById('upload-status');
                    if (uploadStatus) {
                        uploadStatus.innerText = `Enviando: ${Math.round(progress)}%`;
                        uploadStatus.style.color = 'blue';
                    }
                },
                (error) => {
                    // Erro no upload
                    console.error("Erro no upload:", error);
                    reject(error);
                },
                async () => {
                    // Upload completo - obter URL
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        console.log("Upload concluído:", downloadURL);
                        
                        const uploadStatus = document.getElementById('upload-status');
                        if (uploadStatus) {
                            uploadStatus.innerText = "Upload concluído!";
                            uploadStatus.style.color = 'green';
                        }
                        
                        resolve(downloadURL);
                    } catch (urlError) {
                        reject(urlError);
                    }
                }
            );
        });
    } catch (error) {
        console.error("Erro no upload:", error);
        throw error;
    }
}

// Função para comprimir imagem antes do upload (opcional)
async function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Redimensionar se necessário
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            
            img.onerror = reject;
        };
        
        reader.onerror = reject;
    });
}