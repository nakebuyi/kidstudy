export default defineAppConfig({
  pages: [
    "pages/index/index",
  ],
  subPackages: [
    {
      root: "pages/learning/",
      name: "learning",
      pages: [
        "dashboard/index",
        "calendar/index",
        "subject/index",
        "games/pet/index",
        "games/shop/index",
        "settings/index",
      ],
    },
    {
      root: "pages/parent/",
      name: "parent",
      pages: [
        "children/index",
        "report/index",
        "settings/index",
      ],
    },
    {
      root: "pages/content/",
      name: "content",
      pages: [],
    },
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#FF9800",
    navigationBarTitleText: "幼小衔接学习",
    navigationBarTextStyle: "white",
  },
  tabBar: {
    color: "#999",
    selectedColor: "#FF9800",
    backgroundColor: "#fff",
    list: [
      {
        pagePath: "pages/learning/dashboard/index",
        text: "学习",
        iconPath: "assets/icons/learn.png",
        selectedIconPath: "assets/icons/learn-active.png",
      },
      {
        pagePath: "pages/learning/games/pet/index",
        text: "宠物",
        iconPath: "assets/icons/pet.png",
        selectedIconPath: "assets/icons/pet-active.png",
      },
      {
        pagePath: "pages/learning/settings/index",
        text: "我的",
        iconPath: "assets/icons/me.png",
        selectedIconPath: "assets/icons/me-active.png",
      },
    ],
  },
});
