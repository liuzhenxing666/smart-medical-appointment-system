Component({
  properties: {
    iconType: {
      type: String,
      value: 'empty'
    },
    title: {
      type: String,
      value: '暂无数据'
    },
    description: {
      type: String,
      value: ''
    },
    buttonText: {
      type: String,
      value: ''
    }
  },
  
  methods: {
    onButtonTap() {
      this.triggerEvent('buttontap');
    }
  }
})