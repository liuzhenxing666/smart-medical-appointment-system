Component({
  properties: {
    item: {
      type: Object,
      value: {}
    },
    index: {
      type: Number,
      value: 0
    },
    showStats: {
      type: Boolean,
      value: true
    },
    showActions: {
      type: Boolean,
      value: true
    },
    customClass: {
      type: String,
      value: ''
    }
  },
  
  methods: {
    onItemTap(e) {
      this.triggerEvent('itemtap', {
        item: this.data.item,
        index: this.data.index
      });
    },
    
    onImageError(e) {
      this.triggerEvent('imageerror', {
        index: this.data.index,
        item: this.data.item
      });
    }
  }
})