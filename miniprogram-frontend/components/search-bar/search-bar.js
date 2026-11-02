Component({
  properties: {
    placeholder: {
      type: String,
      value: '搜索'
    },
    searchValue: {
      type: String,
      value: ''
    },
    showFilter: {
      type: Boolean,
      value: false
    }
  },
  
  methods: {
    onSearchInput(e) {
      this.triggerEvent('searchinput', {
        value: e.detail.value
      });
    },
    
    onSearchConfirm(e) {
      this.triggerEvent('searchconfirm', {
        value: e.detail.value
      });
    },
    
    onClearSearch() {
      this.triggerEvent('clearsearch');
    },
    
    onFilterTap() {
      this.triggerEvent('filtertap');
    }
  }
})