// API测试脚本 - 智能预约挂号系统

// API基础URL
const API_BASE_URL = '/api';

// 测试结果统计
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

// 测试配置
const testConfigs = [
    // 用户认证API测试
    {
        name: '用户登录',
        url: `${API_BASE_URL}/users/auth/login/`,
        method: 'POST',
        data: {
            username: 'testuser',
            password: 'testpass'
        },
        expectedStatus: 200,
        category: 'auth'
    },
    {
        name: '检查用户状态',
        url: `${API_BASE_URL}/users/auth/check/`,
        method: 'GET',
        requiresAuth: true,
        expectedStatus: 200,
        category: 'auth'
    },
    {
        name: '刷新Token',
        url: `${API_BASE_URL}/users/auth/refresh-token/`,
        method: 'POST',
        requiresAuth: true,
        expectedStatus: 200,
        category: 'auth'
    },
    
    // 医院API测试
    {
        name: '获取医院列表',
        url: `${API_BASE_URL}/hospitals/`,
        method: 'GET',
        expectedStatus: 200,
        category: 'hospitals'
    },
    {
        name: '搜索医院',
        url: `${API_BASE_URL}/hospitals/search/`,
        method: 'GET',
        params: {
            q: '医院'
        },
        expectedStatus: 200,
        category: 'hospitals'
    },
    {
        name: '附近医院',
        url: `${API_BASE_URL}/hospitals/nearby/`,
        method: 'GET',
        params: {
            latitude: 39.9042,
            longitude: 116.4074,
            radius: 10
        },
        expectedStatus: 200,
        category: 'hospitals'
    },
    
    // 医生API测试
    {
        name: '获取医生列表',
        url: `${API_BASE_URL}/doctors/`,
        method: 'GET',
        expectedStatus: 200,
        category: 'doctors'
    },
    {
        name: '搜索医生',
        url: `${API_BASE_URL}/doctors/search/`,
        method: 'GET',
        params: {
            q: '医生'
        },
        expectedStatus: 200,
        category: 'doctors'
    },
    {
        name: '附近医生',
        url: `${API_BASE_URL}/doctors/nearby/`,
        method: 'GET',
        params: {
            latitude: 39.9042,
            longitude: 116.4074,
            radius: 10
        },
        expectedStatus: 200,
        category: 'doctors'
    },
    {
        name: '热门医生推荐',
        url: `${API_BASE_URL}/doctors/top/`,
        method: 'GET',
        expectedStatus: 200,
        category: 'doctors'
    },
    
    // 预约API测试
    {
        name: '获取预约列表',
        url: `${API_BASE_URL}/appointments/`,
        method: 'GET',
        requiresAuth: true,
        expectedStatus: 200,
        category: 'appointments'
    },
    {
        name: '预约仪表板',
        url: `${API_BASE_URL}/appointments/dashboard/`,
        method: 'GET',
        requiresAuth: true,
        expectedStatus: 200,
        category: 'appointments'
    },
    {
        name: '即将到来的预约',
        url: `${API_BASE_URL}/appointments/upcoming/`,
        method: 'GET',
        requiresAuth: true,
        expectedStatus: 200,
        category: 'appointments'
    },
    {
        name: '预约历史',
        url: `${API_BASE_URL}/appointments/history/`,
        method: 'GET',
        requiresAuth: true,
        expectedStatus: 200,
        category: 'appointments'
    },
    
    // 收藏API测试
    {
        name: '获取收藏列表',
        url: `${API_BASE_URL}/favorites/`,
        method: 'GET',
        requiresAuth: true,
        expectedStatus: 200,
        category: 'favorites'
    },
    
    // 位置API测试
    {
        name: '获取城市列表',
        url: `${API_BASE_URL}/location/cities/`,
        method: 'GET',
        expectedStatus: 200,
        category: 'location'
    },
    {
        name: '获取区域列表',
        url: `${API_BASE_URL}/location/districts/`,
        method: 'GET',
        params: {
            city_id: '1'
        },
        expectedStatus: 200,
        category: 'location'
    },
    {
        name: '地理编码',
        url: `${API_BASE_URL}/location/geocode/`,
        method: 'GET',
        params: {
            address: '北京市朝阳区'
        },
        expectedStatus: 200,
        category: 'location'
    },
    
    // 推荐API测试
    {
        name: '推荐医院',
        url: `${API_BASE_URL}/recommendation/hospitals/`,
        method: 'GET',
        expectedStatus: 200,
        category: 'recommendation'
    },
    {
        name: '推荐医生',
        url: `${API_BASE_URL}/recommendation/doctors/`,
        method: 'GET',
        expectedStatus: 200,
        category: 'recommendation'
    }
];

// 执行单个API测试
async function executeApiTest(config) {
    const { url, method, params, data, requiresAuth, expectedStatus } = config;
    
    // 构建请求选项
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // 添加认证头
    if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('需要登录但未找到Token');
        }
        options.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加请求体
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }
    
    // 构建URL
    let requestUrl = url;
    if (params) {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            queryParams.append(key, value);
        }
        requestUrl += `?${queryParams.toString()}`;
    }
    
    // 发送请求
    const response = await fetch(requestUrl, options);
    
    // 处理响应
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
    } else {
        responseData = await response.text();
    }
    
    // 检查响应状态
    if (response.status !== expectedStatus) {
        throw new Error(`期望状态码 ${expectedStatus}，实际收到 ${response.status}: ${responseData.detail || response.statusText}`);
    }
    
    // 保存登录响应中的Token
    if (config.url.includes('/auth/login/') && responseData.access) {
        localStorage.setItem('token', responseData.access);
    }
    
    return {
        status: response.status,
        statusText: response.statusText,
        data: responseData
    };
}

// 运行所有测试
async function runAllTests() {
    console.log('开始运行API测试...');
    
    // 重置测试结果
    testResults = {
        total: testConfigs.length,
        passed: 0,
        failed: 0,
        errors: []
    };
    
    // 按类别分组测试
    const categories = [...new Set(testConfigs.map(config => config.category))];
    
    for (const category of categories) {
        console.log(`\n=== 测试 ${category.toUpperCase()} API ===`);
        
        const categoryTests = testConfigs.filter(config => config.category === category);
        
        for (const config of categoryTests) {
            try {
                console.log(`测试: ${config.name}`);
                const result = await executeApiTest(config);
                console.log(`✓ ${config.name} - 成功`);
                testResults.passed++;
                
                // 检查响应数据结构
                if (config.category === 'hospitals' && config.name === '获取医院列表') {
                    validateHospitalListResponse(result.data);
                } else if (config.category === 'doctors' && config.name === '获取医生列表') {
                    validateDoctorListResponse(result.data);
                } else if (config.category === 'appointments' && config.name === '获取预约列表') {
                    validateAppointmentListResponse(result.data);
                }
                
            } catch (error) {
                console.error(`✗ ${config.name} - 失败: ${error.message}`);
                testResults.failed++;
                testResults.errors.push({
                    test: config.name,
                    error: error.message
                });
            }
            
            // 添加延迟，避免请求过快
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    // 显示测试总结
    console.log('\n=== 测试总结 ===');
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过: ${testResults.passed}`);
    console.log(`失败: ${testResults.failed}`);
    console.log(`成功率: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n=== 错误详情 ===');
        testResults.errors.forEach(error => {
            console.log(`${error.test}: ${error.error}`);
        });
    }
    
    return testResults;
}

// 验证医院列表响应
function validateHospitalListResponse(data) {
    if (!data) {
        throw new Error('响应数据为空');
    }
    
    // 检查是否有results字段（分页）或者是数组（非分页）
    const hospitals = data.results || data;
    
    if (!Array.isArray(hospitals)) {
        throw new Error('医院列表不是数组格式');
    }
    
    if (hospitals.length > 0) {
        const hospital = hospitals[0];
        const requiredFields = ['id', 'name'];
        
        for (const field of requiredFields) {
            if (!(field in hospital)) {
                throw new Error(`医院对象缺少必需字段: ${field}`);
            }
        }
    }
    
    console.log('  ✓ 医院列表响应结构验证通过');
}

// 验证医生列表响应
function validateDoctorListResponse(data) {
    if (!data) {
        throw new Error('响应数据为空');
    }
    
    // 检查是否有results字段（分页）或者是数组（非分页）
    const doctors = data.results || data;
    
    if (!Array.isArray(doctors)) {
        throw new Error('医生列表不是数组格式');
    }
    
    if (doctors.length > 0) {
        const doctor = doctors[0];
        const requiredFields = ['id', 'name'];
        
        for (const field of requiredFields) {
            if (!(field in doctor)) {
                throw new Error(`医生对象缺少必需字段: ${field}`);
            }
        }
    }
    
    console.log('  ✓ 医生列表响应结构验证通过');
}

// 验证预约列表响应
function validateAppointmentListResponse(data) {
    if (!data) {
        throw new Error('响应数据为空');
    }
    
    // 检查是否有results字段（分页）或者是数组（非分页）
    const appointments = data.results || data;
    
    if (!Array.isArray(appointments)) {
        throw new Error('预约列表不是数组格式');
    }
    
    if (appointments.length > 0) {
        const appointment = appointments[0];
        const requiredFields = ['id', 'appointment_date'];
        
        for (const field of requiredFields) {
            if (!(field in appointment)) {
                throw new Error(`预约对象缺少必需字段: ${field}`);
            }
        }
    }
    
    console.log('  ✓ 预约列表响应结构验证通过');
}

// 测试前端页面API调用
async function testPageApiCalls() {
    console.log('\n=== 测试前端页面API调用 ===');
    
    // 测试首页API调用
    console.log('测试首页API调用...');
    try {
        // 模拟首页加载推荐医院
        const hospitalsResponse = await fetch(`${API_BASE_URL}/hospitals/?featured=true&page_size=8`);
        if (hospitalsResponse.ok) {
            const hospitalsData = await hospitalsResponse.json();
            console.log('✓ 首页推荐医院API调用成功');
        } else {
            throw new Error(`首页推荐医院API调用失败: ${hospitalsResponse.status}`);
        }
        
        // 模拟首页加载推荐医生
        const doctorsResponse = await fetch(`${API_BASE_URL}/doctors/?featured=true&page_size=8`);
        if (doctorsResponse.ok) {
            const doctorsData = await doctorsResponse.json();
            console.log('✓ 首页推荐医生API调用成功');
        } else {
            throw new Error(`首页推荐医生API调用失败: ${doctorsResponse.status}`);
        }
        
        // 模拟首页加载科室列表
        const departmentsResponse = await fetch(`${API_BASE_URL}/departments/?page_size=12`);
        if (departmentsResponse.ok) {
            const departmentsData = await departmentsResponse.json();
            console.log('✓ 首页科室列表API调用成功');
        } else {
            throw new Error(`首页科室列表API调用失败: ${departmentsResponse.status}`);
        }
        
    } catch (error) {
        console.error(`✗ 首页API调用测试失败: ${error.message}`);
        testResults.errors.push({
            test: '首页API调用',
            error: error.message
        });
        testResults.failed++;
    }
    
    // 测试医院列表页面API调用
    console.log('测试医院列表页面API调用...');
    try {
        const hospitalListResponse = await fetch(`${API_BASE_URL}/hospitals/`);
        if (hospitalListResponse.ok) {
            const hospitalListData = await hospitalListResponse.json();
            console.log('✓ 医院列表页面API调用成功');
        } else {
            throw new Error(`医院列表页面API调用失败: ${hospitalListResponse.status}`);
        }
    } catch (error) {
        console.error(`✗ 医院列表页面API调用测试失败: ${error.message}`);
        testResults.errors.push({
            test: '医院列表页面API调用',
            error: error.message
        });
        testResults.failed++;
    }
    
    // 测试医生列表页面API调用
    console.log('测试医生列表页面API调用...');
    try {
        const doctorListResponse = await fetch(`${API_BASE_URL}/doctors/`);
        if (doctorListResponse.ok) {
            const doctorListData = await doctorListResponse.json();
            console.log('✓ 医生列表页面API调用成功');
        } else {
            throw new Error(`医生列表页面API调用失败: ${doctorListResponse.status}`);
        }
    } catch (error) {
        console.error(`✗ 医生列表页面API调用测试失败: ${error.message}`);
        testResults.errors.push({
            test: '医生列表页面API调用',
            error: error.message
        });
        testResults.failed++;
    }
    
    // 测试搜索功能API调用
    console.log('测试搜索功能API调用...');
    try {
        const searchResponse = await fetch(`${API_BASE_URL}/hospitals/search/?q=医院`);
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log('✓ 搜索功能API调用成功');
        } else {
            throw new Error(`搜索功能API调用失败: ${searchResponse.status}`);
        }
    } catch (error) {
        console.error(`✗ 搜索功能API调用测试失败: ${error.message}`);
        testResults.errors.push({
            test: '搜索功能API调用',
            error: error.message
        });
        testResults.failed++;
    }
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testPageApiCalls,
        executeApiTest
    };
}

// 如果在浏览器环境中运行，将函数添加到全局对象
if (typeof window !== 'undefined') {
    window.apiTests = {
        runAllTests,
        testPageApiCalls,
        executeApiTest
    };
}