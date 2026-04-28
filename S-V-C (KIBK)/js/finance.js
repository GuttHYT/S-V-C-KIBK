// Sistema Financeiro Completo
const FinanceSystem = {
    // Configurações de taxas (admin pode alterar)
    defaultConfig: {
        platformFee: 5, // 5% por venda
        packagingFee: 0.50, // R$ 0,50 por produto para embalagem
        paymentDay: 5, // Dia 5 de cada mês para pagamento
        graceDays: 3, // 3 dias de tolerância
        blockAfterDue: true, // Bloquear após vencimento
        allowGroupPayment: true // Permitir pagamento em grupo
    },

    // Inicializar sistema
    async init() {
        await this.loadConfig();
        await this.loadVendorFinances();
        this.setupEventListeners();
    },

    // Carregar configurações de taxas
    async loadConfig() {
        try {
            const doc = await db.collection('settings').doc('finance').get();
            if (doc.exists) {
                this.config = { ...this.defaultConfig, ...doc.data() };
            } else {
                this.config = this.defaultConfig;
                await db.collection('settings').doc('finance').set(this.defaultConfig);
            }
        } catch (error) {
            console.error("Erro ao carregar config financeira:", error);
            this.config = this.defaultConfig;
        }
    },

    // Calcular taxas para um vendedor
    async calculateVendorFees(sellerId, month = null) {
        const now = new Date();
        const targetMonth = month || now.getMonth();
        const targetYear = now.getFullYear();
        
        // Buscar pedidos do mês
        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        
        const ordersSnap = await db.collection('orders')
            .where('sellerId', '==', sellerId)
            .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startOfMonth))
            .where('createdAt', '<=', firebase.firestore.Timestamp.fromDate(endOfMonth))
            .get();

        let totalSales = 0;
        let totalProducts = 0;
        let totalRevenue = 0;
        const orderDetails = [];

        // Buscar produtos do vendedor para calcular custos
        const productsSnap = await db.collection('products')
            .where('sellerId', '==', sellerId)
            .get();
        
        const productsMap = {};
        productsSnap.forEach(doc => {
            productsMap[doc.data().name] = doc.data();
        });

        for (const orderDoc of ordersSnap.docs) {
            const order = orderDoc.data();
            const product = productsMap[order.productName];
            
            if (product) {
                totalSales++;
                totalProducts += order.quantity;
                
                const productPrice = product.price || 0;
                const costPrice = product.costPrice || 0;
                const packagingCost = product.packagingCost || this.config.packagingFee;
                
                const revenue = order.quantity * productPrice;
                const costs = order.quantity * (costPrice + packagingCost);
                const profit = revenue - costs;
                const platformFee = revenue * (this.config.platformFee / 100);
                
                totalRevenue += revenue;
                
                orderDetails.push({
                    orderId: orderDoc.id,
                    productName: order.productName,
                    quantity: order.quantity,
                    price: productPrice,
                    costPrice: costPrice,
                    packagingCost: packagingCost,
                    revenue: revenue,
                    costs: costs,
                    profit: profit,
                    platformFee: platformFee,
                    netProfit: profit - platformFee,
                    date: order.createdAt ? new Date(order.createdAt.seconds * 1000) : null
                });
            }
        }

        const totalPlatformFees = totalRevenue * (this.config.platformFee / 100);
        const totalPackagingFees = totalProducts * this.config.packagingFee;

        return {
            sellerId,
            month: targetMonth + 1,
            year: targetYear,
            totalSales,
            totalProducts,
            totalRevenue: totalRevenue.toFixed(2),
            totalPlatformFees: totalPlatformFees.toFixed(2),
            totalPackagingFees: totalPackagingFees.toFixed(2),
            totalFees: (totalPlatformFees + totalPackagingFees).toFixed(2),
            orderDetails,
            generatedAt: new Date().toISOString()
        };
    },

    // Salvar relatório financeiro
    async saveFinancialReport(sellerId) {
        try {
            const report = await this.calculateVendorFees(sellerId);
            
            await db.collection('financialReports').add({
                ...report,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                dueDate: new Date(report.year, report.month, this.config.paymentDay)
            });

            return report;
        } catch (error) {
            console.error("Erro ao salvar relatório:", error);
            throw error;
        }
    },

    // Verificar status de pagamento
    async checkPaymentStatus(sellerId) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const reportsSnap = await db.collection('financialReports')
            .where('sellerId', '==', sellerId)
            .where('month', '==', currentMonth + 1)
            .where('year', '==', currentYear)
            .limit(1)
            .get();

        if (reportsSnap.empty) {
            return { status: 'no_report', message: 'Nenhum relatório gerado este mês' };
        }

        const report = reportsSnap.docs[0].data();
        const dueDate = new Date(report.year, report.month, this.config.paymentDay);
        const graceEndDate = new Date(dueDate);
        graceEndDate.setDate(graceEndDate.getDate() + this.config.graceDays);

        if (report.status === 'paid') {
            return { status: 'paid', message: 'Pagamento em dia ✅' };
        } else if (now > graceEndDate) {
            return { status: 'overdue', message: 'Pagamento atrasado! ⚠️' };
        } else if (now > dueDate) {
            return { status: 'grace', message: 'Em período de tolerância ⏳' };
        } else {
            return { status: 'pending', message: 'Aguardando pagamento' };
        }
    },

    // Bloquear/desbloquear vendedor
    async toggleVendorBlock(sellerId, block) {
        try {
            await db.collection('users').doc(sellerId).update({
                isBlocked: block,
                blockedAt: block ? firebase.firestore.FieldValue.serverTimestamp() : null
            });

            // Notificar vendedor
            if (block) {
                await this.sendPaymentReminder(sellerId, 'block');
            }

            return true;
        } catch (error) {
            console.error("Erro ao alterar bloqueio:", error);
            return false;
        }
    },

    // Enviar lembrete de pagamento
    async sendPaymentReminder(sellerId, type = 'reminder') {
        const sellerDoc = await db.collection('users').doc(sellerId).get();
        const seller = sellerDoc.data();
        const report = await this.calculateVendorFees(sellerId);
        
        const messages = {
            reminder: `Olá ${seller.name}! Lembrete: Sua taxa da plataforma vence em breve. Total: R$ ${report.totalFees}`,
            overdue: `⚠️ ${seller.name}, seu pagamento está atrasado! Total: R$ ${report.totalFees}. Regularize para evitar bloqueio.`,
            block: `🚫 ${seller.name}, sua conta foi bloqueada por falta de pagamento. Total devido: R$ ${report.totalFees}`
        };

        // Salvar notificação
        await db.collection('notifications').add({
            userId: sellerId,
            type: 'payment',
            message: messages[type],
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Enviar WhatsApp se tiver número
        if (seller.whatsapp) {
            const msg = encodeURIComponent(messages[type]);
            // window.open(`https://wa.me/${seller.whatsapp}?text=${msg}`); // Descomentar para enviar WhatsApp
        }
    },

    // Registrar pagamento
    async registerPayment(sellerId, amount, method = 'pix') {
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            // Buscar relatório do mês
            const reportsSnap = await db.collection('financialReports')
                .where('sellerId', '==', sellerId)
                .where('month', '==', currentMonth)
                .where('year', '==', currentYear)
                .limit(1)
                .get();

            if (!reportsSnap.empty) {
                await reportsSnap.docs[0].ref.update({
                    status: 'paid',
                    paidAmount: amount,
                    paymentMethod: method,
                    paidAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Desbloquear vendedor se estava bloqueado
            const sellerDoc = await db.collection('users').doc(sellerId).get();
            if (sellerDoc.data().isBlocked) {
                await this.toggleVendorBlock(sellerId, false);
            }

            // Salvar histórico de pagamento
            await db.collection('paymentHistory').add({
                sellerId,
                amount,
                method,
                month: currentMonth,
                year: currentYear,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return true;
        } catch (error) {
            console.error("Erro ao registrar pagamento:", error);
            return false;
        }
    },

    // Calcular rateio para pagamento em grupo
    async calculateGroupSplit(sellerIds) {
        let totalFees = 0;
        const individualFees = [];
        
        for (const sellerId of sellerIds) {
            const report = await this.calculateVendorFees(sellerId);
            totalFees += parseFloat(report.totalFees);
            individualFees.push({
                sellerId,
                name: (await db.collection('users').doc(sellerId).get()).data().name,
                amount: report.totalFees
            });
        }
        
        return {
            totalFees: totalFees.toFixed(2),
            splitAmount: (totalFees / sellerIds.length).toFixed(2),
            individualFees
        };
    },

    // Calculadora de lucros
    calculateProfit(inputs) {
        const {
            sellingPrice,    // Preço de venda
            costPrice,       // Preço de custo
            packagingCost,   // Custo de embalagem
            quantity,        // Quantidade
            otherCosts       // Outros custos
        } = inputs;

        const totalRevenue = sellingPrice * quantity;
        const totalCost = (costPrice + packagingCost) * quantity + (otherCosts || 0);
        const grossProfit = totalRevenue - totalCost;
        const platformFee = totalRevenue * (this.config.platformFee / 100);
        const netProfit = grossProfit - platformFee;
        const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1);

        return {
            totalRevenue,
            totalCost,
            grossProfit,
            platformFee,
            netProfit,
            profitMargin,
            breakEvenPoint: Math.ceil(totalCost / sellingPrice)
        };
    },

    // Interface da calculadora
    showCalculator() {
        const calculatorHTML = `
            <div class="card" style="max-width: 500px; margin: 20px auto;">
                <h3>🧮 Calculadora de Lucros</h3>
                <div style="display: grid; gap: 10px; margin-top: 15px;">
                    <div>
                        <label>Preço de Venda (R$):</label>
                        <input type="number" id="calc-selling-price" step="0.01" placeholder="Ex: 5.00">
                    </div>
                    <div>
                        <label>Custo de Produção (R$):</label>
                        <input type="number" id="calc-cost-price" step="0.01" placeholder="Ex: 2.00">
                    </div>
                    <div>
                        <label>Custo de Embalagem (R$):</label>
                        <input type="number" id="calc-packaging" step="0.01" placeholder="Ex: 0.50">
                    </div>
                    <div>
                        <label>Quantidade Vendida:</label>
                        <input type="number" id="calc-quantity" placeholder="Ex: 10">
                    </div>
                    <div>
                        <label>Outros Custos (R$):</label>
                        <input type="number" id="calc-other" step="0.01" placeholder="Ex: 5.00" value="0">
                    </div>
                    <button class="btn" onclick="FinanceSystem.performCalculation()" style="width: 100%;">
                        Calcular
                    </button>
                </div>
                <div id="calc-result" style="margin-top: 20px; display: none;"></div>
            </div>
        `;

        return calculatorHTML;
    },

    performCalculation() {
        const inputs = {
            sellingPrice: parseFloat(document.getElementById('calc-selling-price').value) || 0,
            costPrice: parseFloat(document.getElementById('calc-cost-price').value) || 0,
            packagingCost: parseFloat(document.getElementById('calc-packaging').value) || 0,
            quantity: parseInt(document.getElementById('calc-quantity').value) || 0,
            otherCosts: parseFloat(document.getElementById('calc-other').value) || 0
        };

        const result = this.calculateProfit(inputs);
        const resultDiv = document.getElementById('calc-result');
        
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 10px;">
                <h4>Resultado do Cálculo:</h4>
                <div style="margin-top: 10px;">
                    <p>📊 Receita Total: <strong>R$ ${result.totalRevenue.toFixed(2)}</strong></p>
                    <p>💰 Custo Total: <strong>R$ ${result.totalCost.toFixed(2)}</strong></p>
                    <p>📈 Lucro Bruto: <strong style="color: ${result.grossProfit >= 0 ? 'green' : 'red'}">R$ ${result.grossProfit.toFixed(2)}</strong></p>
                    <p>🏦 Taxa da Plataforma (${this.config.platformFee}%): <strong>R$ ${result.platformFee.toFixed(2)}</strong></p>
                    <p>✨ Lucro Líquido: <strong style="color: ${result.netProfit >= 0 ? 'green' : 'red'}">R$ ${result.netProfit.toFixed(2)}</strong></p>
                    <p>📊 Margem de Lucro: <strong>${result.profitMargin}%</strong></p>
                    <p>🎯 Ponto de Equilíbrio: <strong>${result.breakEvenPoint} unidades</strong></p>
                </div>
            </div>
        `;
    },

    setupEventListeners() {
        // Verificar pagamentos pendentes periodicamente
        setInterval(() => this.checkOverduePayments(), 3600000); // A cada hora
    },

    async checkOverduePayments() {
        const sellersSnap = await db.collection('users')
            .where('role', '==', 'seller')
            .get();

        for (const sellerDoc of sellersSnap.docs) {
            const status = await this.checkPaymentStatus(sellerDoc.id);
            
            if (status.status === 'overdue' && this.config.blockAfterDue) {
                const seller = sellerDoc.data();
                if (!seller.isBlocked) {
                    await this.toggleVendorBlock(sellerDoc.id, true);
                    await this.sendPaymentReminder(sellerDoc.id, 'block');
                }
            }
        }
    }
};